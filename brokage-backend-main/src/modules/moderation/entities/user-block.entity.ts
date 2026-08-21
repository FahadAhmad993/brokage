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
import { UserEntity } from '../../users/entities/user.entity';

/**
 * One row per (blocker → blocked) relationship. A user who blocks another can
 * no longer be contacted by them, and stops seeing their content. Both FKs
 * cascade on user deletion so blocks vanish with either account.
 */
@Entity('user_blocks')
@Unique('UQ_user_blocks_blocker_blocked', ['blockerId', 'blockedId'])
export class UserBlockEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  blockerId!: string;

  @Index()
  @Column()
  blockedId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockerId' })
  blocker!: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockedId' })
  blocked!: UserEntity;

  @CreateDateColumn()
  createdAt!: Date;
}
