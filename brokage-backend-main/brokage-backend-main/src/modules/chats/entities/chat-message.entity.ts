import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatThreadEntity } from './chat-thread.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('chat_messages')
export class ChatMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  threadId!: string;

  @Index()
  @Column()
  authorId!: string;

  /**
   * Client-generated idempotency key. Same value sent twice (e.g. retry after
   * a flaky socket) returns the original row instead of inserting a duplicate.
   * Scoped per-author so one user's clientId can never collide with another's.
   */
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  clientId!: string | null;

  @ManyToOne(() => ChatThreadEntity, (thread) => thread.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'threadId' })
  thread!: ChatThreadEntity;

  @ManyToOne(() => UserEntity, (user) => user.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author!: UserEntity;

  @Column({ type: 'text' })
  body!: string;

  /**
   * Optional location attachment. Stored as JSONB so future fields (e.g.
   * `accuracy`, `name`) can be added without another migration. `null` when
   * the message has no location share.
   */
  @Column({ type: 'jsonb', nullable: true })
  locationContext!: {
    latitude: number;
    longitude: number;
    label?: string | null;
  } | null;

  /**
 * Optional image attachment.
 * The actual image is stored externally; only its URL is saved here.
 */
@Column({ type: 'text', nullable: true })
imageUrl!: string | null;

/**
 * Community Add attached to a chat message.
 * The Add itself is a message attachment, not thread metadata.
 */
@Column({ type: 'jsonb', nullable: true })
communityPostContext!: {
  id: string;
  title: string;
  description: string;
  city: string;
  images: string[];
  authorId: string;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
} | null;

  @CreateDateColumn()
  createdAt!: Date;

  /** User ids who deleted this message "for me" — hidden from their list only. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  deletedForUserIds!: string[];

  /** Author-only "delete for everyone" — content is blanked, row is kept. */
  @Column({ type: 'boolean', default: false })
  isDeletedForEveryone!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date | null;
}
