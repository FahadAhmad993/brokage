import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import {
  fetchAdminChatThreads,
  fetchAdminThreadMessages,
  type AdminChatThread,
  type ChatThreadParticipant,
} from '../api/admin';
import { errorMessage } from '../api/client';

function ParticipantChip({ p }: { p: ChatThreadParticipant }) {
  return (
    <div className="user-cell">
      <div className="user-cell__avatar">
        {p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : p.displayName.slice(0, 1).toUpperCase()}
      </div>
      <div>
        <div className="user-cell__name">
          {p.displayName} {p.isBlocked ? <Badge tone="bad">Blocked</Badge> : null}
        </div>
        <div className="user-cell__email">{p.email}</div>
      </div>
    </div>
  );
}

/** Thread list row — click opens the full conversation panel below it. */
function ThreadRow({
  thread,
  selected,
  onSelect,
}: {
  thread: AdminChatThread;
  selected: boolean;
  onSelect: () => void;
}) {
  const [a, b] = thread.participants;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`chat-thread-row ${selected ? 'chat-thread-row--selected' : ''}`}
    >
      <div className="chat-thread-row__people">
        {a ? <ParticipantChip p={a} /> : <span>Unknown</span>}
        <span className="chat-thread-row__arrow">↔</span>
        {b ? <ParticipantChip p={b} /> : <span>Unknown</span>}
      </div>
      <div className="chat-thread-row__preview">
        {thread.lastMessage ? (
          <>
            <span className="chat-thread-row__preview-text">
              {thread.lastMessage.body?.trim()
                ? thread.lastMessage.body
                : thread.lastMessage.imageUrl
                  ? '📷 Photo'
                  : '—'}
            </span>
            <span className="chat-thread-row__preview-time">
              {new Date(thread.lastMessage.createdAt).toLocaleString()}
            </span>
          </>
        ) : (
          <span className="chat-thread-row__preview-text">No messages yet</span>
        )}
      </div>
      <div className="chat-thread-row__count">
        <Badge tone="neutral">{thread.messageCount} msg{thread.messageCount === 1 ? '' : 's'}</Badge>
      </div>
    </button>
  );
}

/** Full raw conversation for one thread — every message, unfiltered, for moderation review. */
function ConversationPanel({ thread }: { thread: AdminChatThread }) {
  const messagesQuery = useQuery({
    queryKey: ['admin', 'chats', 'thread-messages', thread.id],
    queryFn: () => fetchAdminThreadMessages(thread.id),
  });

  const [a, b] = thread.participants;

  return (
    <div className="chat-conversation-panel">
      <div className="chat-conversation-panel__header">
        <h3>
          {a?.displayName ?? 'Unknown'} ↔ {b?.displayName ?? 'Unknown'}
        </h3>
        <span className="ad-card__meta">
          {thread.messageCount} message{thread.messageCount === 1 ? '' : 's'} total
        </span>
      </div>

      {messagesQuery.isLoading ? <div className="empty-state">Loading conversation…</div> : null}
      {messagesQuery.isError ? (
        <div className="form-error">
          {errorMessage(messagesQuery.error, 'Could not load this conversation.')}
        </div>
      ) : null}

      <div className="chat-conversation-panel__messages">
        {messagesQuery.data?.items.map((m) => (
          <div
            key={m.id}
            className={`chat-msg-bubble ${m.authorId === a?.id ? 'chat-msg-bubble--a' : 'chat-msg-bubble--b'}`}
          >
            <div className="chat-msg-bubble__author">{m.authorName}</div>
            {m.isDeletedForEveryone ? (
              <div className="chat-msg-bubble__deleted">Message deleted</div>
            ) : (
              <>
                {m.imageUrl ? (
                  <img src={m.imageUrl} alt="" className="chat-msg-bubble__image" />
                ) : null}
                {m.body ? <div className="chat-msg-bubble__body">{m.body}</div> : null}
              </>
            )}
            <div className="chat-msg-bubble__time">
              {new Date(m.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
        {messagesQuery.data && messagesQuery.data.items.length === 0 ? (
          <div className="empty-state">No messages in this conversation.</div>
        ) : null}
      </div>
    </div>
  );
}

export function ChatsPage() {
  const [search, setSearch] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const threadsQuery = useQuery({
    queryKey: ['admin', 'chats', 'threads', search],
    queryFn: () => fetchAdminChatThreads({ search: search || undefined }),
  });

  const selectedThread = threadsQuery.data?.items.find((t) => t.id === selectedThreadId) ?? null;

  return (
    <>
      <PageHeader
        title="Chats"
        subtitle="Every private conversation on the platform — who's talking to whom, and what was said."
      />

      <input
        type="text"
        className="field-input"
        placeholder="Search by participant name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 420 }}
      />

      {threadsQuery.isLoading ? <div className="empty-state">Loading conversations…</div> : null}
      {threadsQuery.isError ? (
        <div className="form-error">
          {errorMessage(threadsQuery.error, 'Could not load conversations.')}
        </div>
      ) : null}

      {threadsQuery.data && threadsQuery.data.items.length === 0 ? (
        <div className="empty-state">No direct conversations yet.</div>
      ) : null}

      <div className="chat-thread-list">
        {threadsQuery.data?.items.map((thread) => (
          <div key={thread.id}>
            <ThreadRow
              thread={thread}
              selected={selectedThreadId === thread.id}
              onSelect={() =>
                setSelectedThreadId((current) => (current === thread.id ? null : thread.id))
              }
            />
            {/* Conversation opens inline, directly under the row that was
                tapped — works the same way on a phone-width screen as it
                does on desktop, no separate route/modal needed. */}
            {selectedThread?.id === thread.id ? (
              <ConversationPanel thread={selectedThread} />
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
