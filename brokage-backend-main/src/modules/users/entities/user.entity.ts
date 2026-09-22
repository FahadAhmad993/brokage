import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PropertyEntity } from '../../properties/entities/property.entity';
import { ChatParticipantEntity } from '../../chats/entities/chat-participant.entity';
import { ChatMessageEntity } from '../../chats/entities/chat-message.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  displayName!: string;

  @Column()
  passwordHash!: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  estateName?: string;

  /** Grants access to `/admin/*` endpoints (see `AdminGuard`). Promote the
   *  first admin manually: `UPDATE users SET "isAdmin" = true WHERE email = '...'`. */
  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean;

  /**
   * Must be true before login is allowed to issue a token. Defaults to
   * `true` at the DATABASE level (via the migration) so every account that
   * existed before this feature shipped keeps working unchanged; new
   * registrations explicitly set this to `false` in application code and
   * only flip it once the signup OTP is verified.
   */
  @Column({ type: 'boolean', default: true })
  isEmailVerified!: boolean;

  /** Set by an admin. Blocked users can't log in and existing tokens are
   *  rejected on the next request (checked in `JwtStrategy`). */
  @Column({ type: 'boolean', default: false })
  isBlocked!: boolean;

  /** Same effect as `isBlocked` but conceptually distinct (e.g. "disabled
   *  pending review" vs "blocked for abuse") — kept as a separate admin action. */
  @Column({ type: 'boolean', default: false })
  isDisabled!: boolean;

  /** Admin-supplied note shown on the user's forced-logout screen. */
  @Column({ type: 'text', nullable: true })
  disabledReason?: string | null;

  @OneToMany(() => PropertyEntity, (property) => property.host)
  properties!: PropertyEntity[];

  @OneToMany(() => ChatParticipantEntity, (participant) => participant.user)
  chatParticipants!: ChatParticipantEntity[];

  @OneToMany(() => ChatMessageEntity, (message) => message.author)
  messages!: ChatMessageEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
