import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatParticipantEntity } from './chat-participant.entity';
import { ChatMessageEntity } from './chat-message.entity';
import { PropertyEntity } from '../../properties/entities/property.entity';

@Entity('chat_threads')
export class ChatThreadEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: 'direct' })
  type!: 'group' | 'direct';

  @Column()
  title!: string;

  @Column({ nullable: true })
  relatedPropertyId?: string;

  @ManyToOne(() => PropertyEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'relatedPropertyId' })
  relatedProperty?: PropertyEntity;

  /**
   * A frozen COPY of a community-ad's listing info (id, title, imageUrl,
   * location, priceMonthly), attached when a chat is opened from an ad's
   * advertiser icon/name. Unlike `relatedProperty` (a live FK join into
   * `properties`), this is a snapshot — community posts live in a separate
   * table (`community_posts`) and can be edited/deleted independently, so
   * we intentionally do NOT foreign-key this. If the post changes later,
   * the chat still shows the ad as it was when the conversation started.
   */
  @Column({ type: 'jsonb', nullable: true })
  relatedListingSnapshot?: {
    id: string;
    title: string;
    imageUrl: string;
    location: string;
    priceMonthly: number;
  } | null;

  /**
   * Soft-delete for communities. A deleted community isn't dropped
   * immediately — it's flagged so it can be restored (with every member,
   * message, and ad reference intact, since nothing was actually removed)
   * for 7 days. `ChatRetentionService`'s sweep hard-deletes it once
   * `restoreExpiresAt` passes.
   */
  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  restoreExpiresAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  deletedReason?: string | null;

  @OneToMany(() => ChatParticipantEntity, (participant) => participant.thread, {
    cascade: true,
  })
  participants!: ChatParticipantEntity[];

  @OneToMany(() => ChatMessageEntity, (message) => message.thread, {
    cascade: true,
  })
  messages!: ChatMessageEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  /** Inbox sort key — `ORDER BY updatedAt DESC` runs on every thread-list
   *  fetch, so we index it explicitly. */
  @Index()
  @UpdateDateColumn()
  updatedAt!: Date;
}

//comment data 1

// import {
//   Column,
//   CreateDateColumn,
//   Entity,
//   Index,
//   JoinColumn,
//   ManyToOne,
//   OneToMany,
//   PrimaryGeneratedColumn,
//   UpdateDateColumn,
// } from 'typeorm';
// import { ChatParticipantEntity } from './chat-participant.entity';
// import { ChatMessageEntity } from './chat-message.entity';
// import { PropertyEntity } from '../../properties/entities/property.entity';

// @Entity('chat_threads')
// export class ChatThreadEntity {
//   @PrimaryGeneratedColumn('uuid')
//   id!: string;

//   @Column({ default: 'direct' })
//   type!: 'group' | 'direct';

//   @Column()
//   title!: string;

//   @Column({ nullable: true })
//   relatedPropertyId?: string;

//   @ManyToOne(() => PropertyEntity, { nullable: true, onDelete: 'SET NULL' })
//   @JoinColumn({ name: 'relatedPropertyId' })
//   relatedProperty?: PropertyEntity;

//   @OneToMany(() => ChatParticipantEntity, (participant) => participant.thread, {
//     cascade: true,
//   })
//   participants!: ChatParticipantEntity[];

//   @OneToMany(() => ChatMessageEntity, (message) => message.thread, {
//     cascade: true,
//   })
//   messages!: ChatMessageEntity[];

//   @CreateDateColumn()
//   createdAt!: Date;

//   /** Inbox sort key — `ORDER BY updatedAt DESC` runs on every thread-list
//    *  fetch, so we index it explicitly. */
//   @Index()
//   @UpdateDateColumn()
//   updatedAt!: Date;
// }
