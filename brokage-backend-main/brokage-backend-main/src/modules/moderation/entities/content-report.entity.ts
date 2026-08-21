import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export type ReportTargetType = 'user' | 'message' | 'listing';
export type ReportStatus = 'open' | 'reviewed' | 'actioned' | 'dismissed';

/**
 * A user-submitted report of objectionable content or behaviour. Stored for
 * out-of-band moderation review. `targetId` is a free-form id whose meaning
 * depends on `targetType` (a user id, message id, or property id).
 */
@Entity('content_reports')
export class ContentReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  reporterId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterId' })
  reporter!: UserEntity;

  @Column({ type: 'varchar', length: 16 })
  targetType!: ReportTargetType;

  @Index()
  @Column()
  targetId!: string;

  @Column({ type: 'varchar', length: 64 })
  reason!: string;

  @Column({ type: 'text', nullable: true })
  details?: string | null;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'open' })
  status!: ReportStatus;

  @CreateDateColumn()
  createdAt!: Date;
}
