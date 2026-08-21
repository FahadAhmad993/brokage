import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';

@Entity('community_posts')
export class CommunityPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
userId!: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({
    type: 'varchar',
    length: 100,
  })
  title!: string;

  @Column({
    type: 'text',
  })
  description!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  city!: string;

  @Column({
    type: 'varchar',
    length: 100,
    default: '',
  })
  area!: string;

  @Column({
    type: 'jsonb',
  })
  images!: string[];

  /** How many hours the ad runs once verified (user-picked or free-typed). */
  @Column({ type: 'int', default: 24 })
  durationHours!: number;

  /** PKR price for `durationHours`, computed server-side — never client input. */
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  price!: number;

  /** pending -> active (admin verified) -> expired | rejected */
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: 'pending' | 'active' | 'expired' | 'rejected';

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt!: Date | null;

  /** verifiedAt + durationHours — ad stops showing once this passes. */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null;

  /** Answers to whatever custom fields an admin has added (see AppSettingEntity). */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  extraFields!: Record<string, string>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}