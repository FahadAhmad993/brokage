import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  ChatLocationRefDto,
  ChatMessageDto,
  ChatsService,
} from './chats.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';

type SocketData = {
  user: JwtPayload;
  /** Threads this socket has joined — locally cached so typing/read events
   *  don't hit the DB for membership on every keystroke. */
  memberships: Set<string>;
};

function readSocketData(client: Socket): SocketData {
  const data = client.data as Partial<SocketData>;
  if (!data?.user || !data.memberships) {
    throw new WsException('Unauthorized socket');
  }
  return data as SocketData;
}

function readClientId(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64 || !/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function readImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > 2048) {
    return undefined;
  }

  return trimmed;
}

/**
 * Socket payload doesn't go through class-validator, so we sanity-check
 * lat/lng ranges here. Any malformed payload silently degrades to a plain
 * message (no attachment) rather than 500ing the gateway.
 */
function readLocationContext(value: unknown): ChatLocationRefDto | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const raw = value as Partial<ChatLocationRefDto>;
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return undefined;
  }
  const label =
    typeof raw.label === 'string' ? raw.label.slice(0, 255) : undefined;
  return label !== undefined
    ? { latitude, longitude, label }
    : { latitude, longitude };
}

@WebSocketGateway({
  namespace: '/chat',
  // CORS is permissive here because socket.io's CORS is for the WebSocket
  // *handshake* (which has different cross-origin semantics than HTTP) and
  // the JWT in `auth.token` is the real access control. The HTTP API still
  // enforces `CORS_ORIGIN` via `main.ts`.
  cors: { origin: '*', credentials: true },
  // Heartbeat: 25s with 60s timeout (socket.io defaults, explicit here).
  // Do **not** set `transports: ['websocket']` only — iOS/Android clients
  // often need Engine.IO long-polling as a fallback when raw WebSocket fails
  // (emulators, cleartext, some networks). Default is polling + websocket.
  pingInterval: 25_000,
  pingTimeout: 60_000,
})
export class ChatsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(ChatsGateway.name);
  /** userId → connected-socket count (multiple devices possible). */
  private readonly onlineCounter = new Map<string, number>();
  /** userId → last known display name. */
  private readonly onlineUsers = new Map<string, string>();

  constructor(
    private readonly chatsService: ChatsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    // No-op. CORS is set via the decorator above; mutating it here at runtime
    // is namespace-dependent (server.engine is undefined when `server` is a
    // Namespace) and fragile. Keep this hook so the gateway implements
    // `OnGatewayInit` and Nest's lifecycle stays consistent.
  }

  async handleConnection(client: Socket) {
    const token = (client.handshake.auth?.token ??
      client.handshake.headers.authorization?.replace('Bearer ', '')) as
      | string
      | undefined;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      const data: SocketData = {
        user: payload,
        memberships: new Set<string>(),
      };
      Object.assign(client.data, data);
      await client.join(`user:${payload.sub}`);
      this.trackPresence(payload, 'online');
      this.emitPresenceSnapshot(client);
    } catch (err) {
      this.logger.warn(
        `Rejecting chat socket: ${err instanceof Error ? err.message : 'invalid token'}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const data = client.data as Partial<SocketData>;
    if (!data?.user) {
      return;
    }
    this.trackPresence(data.user, 'offline');
  }

  /**
   * Public broadcast helper used by the HTTP `POST /messages` controller so
   * that messages sent over REST still reach all real-time subscribers.
   * Idempotent and safe to call from outside the gateway.
   *
   * Mirrors socket `message:send`: skip the author’s sockets in the thread room
   * so REST fallback doesn’t double-deliver `message:new` to the sender (they
   * already have the HTTP response).
   */
  async broadcastNewMessage(message: ChatMessageDto) {
    if (!this.server) {
      return;
    }
    // Fan out inbox summaries **before** `message:new` so clients update
    // unread counts/list order before merging the timeline (avoids tab-badge flicker).
    await this.fanOutThreadUpdate(message.threadId);
    try {
      const sockets = await this.server.in(message.threadId).fetchSockets();
      for (const remote of sockets) {
        const sub = (remote.data as { user?: JwtPayload }).user?.sub;
        if (sub && sub !== message.authorId) {
          remote.emit('message:new', message);
        }
      }
    } catch (err) {
      this.logger.warn(
        `broadcastNewMessage falling back to room emit: ${err instanceof Error ? err.message : err}`,
      );
      this.server.to(message.threadId).emit('message:new', message);
    }
  }

  /**
   * Broadcast a "delete for everyone" so every connected device in the
   * thread swaps the bubble to a "message deleted" placeholder live,
   * without needing to refetch the page. Called by the HTTP delete
   * endpoint after the DB update succeeds.
   */
  async broadcastMessageDeleted(threadId: string, messageId: string) {
    if (!this.server) {
      return;
    }
    this.server.to(threadId).emit('message:deleted', { threadId, messageId });
  }

  /** Push a Display post's fresh visitor count to everyone watching it. */
  broadcastDisplayViews(postId: string, viewCount: number) {
    if (!this.server) {
      return;
    }
    this.server
      .to(`display:${postId}`)
      .emit('display:views', { postId, viewCount });
  }

  @SubscribeMessage('display:join')
  async handleDisplayJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { postIds?: string[] },
  ) {
    const ids = (payload?.postIds ?? [])
      .filter((id): id is string => typeof id === 'string' && id.length <= 64)
      .slice(0, 50);
    for (const id of ids) {
      await client.join(`display:${id}`);
    }
    return { status: 'ok' };
  }

  @SubscribeMessage('display:leave')
  async handleDisplayLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { postIds?: string[] },
  ) {
    const ids = (payload?.postIds ?? [])
      .filter((id): id is string => typeof id === 'string' && id.length <= 64)
      .slice(0, 50);
    for (const id of ids) {
      await client.leave(`display:${id}`);
    }
    return { status: 'ok' };
  }

  @SubscribeMessage('thread:join')
  async handleJoinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { threadId: string },
  ) {
    const { user, memberships } = readSocketData(client);
    const threadId = payload?.threadId?.trim();
    if (!threadId) {
      throw new WsException('threadId is required');
    }
    try {
      await this.chatsService.assertMembership(user.sub, threadId);
    } catch (err) {
      throw this.toWsException(err);
    }
    memberships.add(threadId);
    await client.join(threadId);

    // Joining = the user is actively viewing the thread, so reset unread and
    // notify peers that this user has read up to "now".
    const readAt = await this.chatsService.markThreadRead(user.sub, threadId);
    if (readAt) {
      client.to(threadId).emit('message:read', {
        threadId,
        userId: user.sub,
        readAt: readAt.toISOString(),
      });
    }
    // Push a fresh thread summary to this user's other devices/tabs so their
    // unread badge clears immediately.
    const thread = await this.chatsService.getThreadSummaryForUser(
      threadId,
      user.sub,
    );
    this.server.to(`user:${user.sub}`).emit('thread:update', thread);
    return { status: 'ok' };
  }

  @SubscribeMessage('thread:leave')
  async handleLeaveThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { threadId: string },
  ) {
    const { memberships } = readSocketData(client);
    const threadId = payload?.threadId?.trim();
    if (!threadId) {
      throw new WsException('threadId is required');
    }
    memberships.delete(threadId);
    await client.leave(threadId);
    return { status: 'ok' };
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { threadId: string },
  ) {
    return this.emitTyping(client, payload?.threadId, true);
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { threadId: string },
  ) {
    return this.emitTyping(client, payload?.threadId, false);
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { threadId: string },
  ) {
    const { user, memberships } = readSocketData(client);
    const threadId = payload?.threadId?.trim();
    if (!threadId) {
      throw new WsException('threadId is required');
    }
    if (!memberships.has(threadId)) {
      try {
        await this.chatsService.assertMembership(user.sub, threadId);
      } catch (err) {
        throw this.toWsException(err);
      }
      memberships.add(threadId);
    }
    const readAt = await this.chatsService.markThreadRead(user.sub, threadId);
    if (!readAt) {
      throw new WsException('Not a participant');
    }
    client.to(threadId).emit('message:read', {
      threadId,
      userId: user.sub,
      readAt: readAt.toISOString(),
    });
    const thread = await this.chatsService.getThreadSummaryForUser(
      threadId,
      user.sub,
    );
    this.server.to(`user:${user.sub}`).emit('thread:update', thread);
    return { status: 'ok', readAt: readAt.toISOString() };
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      threadId: string;
      body: string;
      clientId?: string;
      locationContext?: ChatLocationRefDto;
      imageUrl?: string;
      communityPostContext?: {
        id: string;
        title: string;
        description: string;
        city: string;
        images: string[];
        authorId: string;
        authorName?: string | null;
        authorAvatarUrl?: string | null;
        kind?: 'community' | 'display';
        marlaSize?: number;
      };
      replyToCommunityMessage?: {
        messageId: string;
        threadId: string;
        threadTitle: string;
        body: string;
        imageUrl?: string | null;
        authorId: string;
        authorName?: string | null;
        authorAvatarUrl?: string | null;
      };
      replyToMessageId?: string;
    },
  ) {
    const { user } = readSocketData(client);
    if (!payload?.threadId?.trim()) {
      throw new WsException('threadId is required');
    }
    if (typeof payload.body !== 'string' || payload.body.trim().length === 0) {
      throw new WsException('Message body is required');
    }
    if (payload.body.length > 5000) {
      throw new WsException('Message exceeds 5000 character limit');
    }

    let saved: ChatMessageDto;
    try {
      saved = await this.chatsService.sendMessage(
        user.sub,
        payload.threadId,
        payload.body,
        readClientId(payload.clientId),
        readLocationContext(payload.locationContext),
        readImageUrl(payload.imageUrl),
        payload.communityPostContext,
        payload.replyToCommunityMessage,
        typeof payload.replyToMessageId === 'string'
          ? payload.replyToMessageId
          : undefined,
      );
    } catch (err) {
      throw this.toWsException(err);
    }
    // Broadcast to the thread room only — `socket.to(...)` excludes the
    // sender so they don't echo their own message (the ack already returns it).
    // Other devices of the same user that aren't in this thread room will
    // pick up the change via the per-user `thread:update` fan-out below;
    // sending another copy via `user:<id>` would double-deliver to any
    // device that's both in the thread *and* in the user room.
    await this.fanOutThreadUpdate(saved.threadId);
    client.to(saved.threadId).emit('message:new', saved);
    return saved;
  }

  private async emitTyping(
    client: Socket,
    rawThreadId: unknown,
    isTyping: boolean,
  ) {
    const { user, memberships } = readSocketData(client);
    const threadId = typeof rawThreadId === 'string' ? rawThreadId.trim() : '';
    if (!threadId) {
      throw new WsException('threadId is required');
    }
    // Cached membership avoids a DB hit per keystroke. On a cache miss
    // (e.g. typing fired before `thread:join` resolved), fall back to a
    // single DB check and remember the answer.
    if (!memberships.has(threadId)) {
      const isMember = await this.chatsService.isMember(user.sub, threadId);
      if (!isMember) {
        throw new WsException('Not a participant in this thread');
      }
      memberships.add(threadId);
    }
    client.to(threadId).emit('typing:update', {
      threadId,
      userId: user.sub,
      userName: user.displayName,
      isTyping,
    });
    return { status: 'ok' };
  }

  /**
   * After a message is persisted, push a fresh thread summary to every
   * participant's `user:<id>` room so inboxes re-sort and unread badges
   * update without a refetch.
   */
  /**
   * Was: one `getThreadSummaryForUser` DB round trip PER PARTICIPANT (N
   * heavy joined queries fired concurrently for an N-member thread, on
   * every single message — see `getThreadSummariesForFanOut` for why this
   * was the main cause of chat slowness). Now: one batched call that does
   * the same work in 2 queries total, then a plain in-memory loop to emit.
   */
  private async fanOutThreadUpdate(threadId: string) {
    const summaries =
      await this.chatsService.getThreadSummariesForFanOut(threadId);
    for (const [participantId, summary] of summaries) {
      this.server.to(`user:${participantId}`).emit('thread:update', summary);
    }
  }

  private trackPresence(user: JwtPayload, mode: 'online' | 'offline') {
    const current = this.onlineCounter.get(user.sub) ?? 0;
    const nextCount =
      mode === 'online' ? current + 1 : Math.max(0, current - 1);
    if (nextCount === 0) {
      this.onlineCounter.delete(user.sub);
      this.onlineUsers.delete(user.sub);
    } else {
      this.onlineCounter.set(user.sub, nextCount);
      this.onlineUsers.set(user.sub, user.displayName);
    }

    const isOnline = nextCount > 0;
    this.server.emit('presence:update', {
      userId: user.sub,
      userName: user.displayName,
      isOnline,
      lastSeenAt: isOnline ? null : new Date().toISOString(),
    });
  }

  private emitPresenceSnapshot(client: Socket) {
    this.onlineCounter.forEach((count, userId) => {
      if (count <= 0) {
        return;
      }
      client.emit('presence:update', {
        userId,
        userName: this.onlineUsers.get(userId) ?? 'User',
        isOnline: true,
        lastSeenAt: null,
      });
    });
  }

  private toWsException(err: unknown): WsException {
    if (err instanceof WsException) {
      return err;
    }
    if (err instanceof ForbiddenException) {
      return new WsException('Forbidden');
    }
    if (err instanceof Error) {
      return new WsException(err.message);
    }
    return new WsException('Unexpected error');
  }
}
