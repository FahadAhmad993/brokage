import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ChatThreadEntity } from './chat-thread.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('chat_participants')
@Unique('UQ_chat_participants_thread_user', ['threadId', 'userId'])
export class ChatParticipantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  threadId!: string;

  @Index()
  @Column()
  userId!: string;

  @ManyToOne(() => ChatThreadEntity, (thread) => thread.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'threadId' })
  thread!: ChatThreadEntity;

  @ManyToOne(() => UserEntity, (user) => user.chatParticipants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'timestamp', nullable: true })
  lastReadAt?: Date;

  @Column({ type: 'int', default: 0 })
  unreadCount!: number;

  /**
   * Set when this user taps "Clear all messages" for this thread. Messages
   * created before this timestamp are filtered out of THIS user's message
   * list only — the peer's history and the underlying rows are untouched.
   */
  @Column({ type: 'timestamp', nullable: true })
  clearedAt?: Date | null;

  /**
   * Set when this user taps "Delete chat" on this thread from their inbox
   * list. The thread is filtered out of THIS user's `listThreads` result
   * only — the thread row, its messages, and the other participant(s) are
   * untouched. Cleared automatically the next time someone else sends a
   * message into the thread, so it reappears like a normal new chat.
   */
  @Column({ type: 'timestamp', nullable: true })
  hiddenAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
