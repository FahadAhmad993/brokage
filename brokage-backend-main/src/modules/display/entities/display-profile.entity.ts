import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * The one thing shown at the very top of a broker's Display page — a
 * cover photo (Facebook-style) separate from their small chat/profile
 * avatar. One row per user, created lazily the first time they set a
 * cover image; a user with no row yet just shows no cover.
 */
@Entity('display_profiles')
export class DisplayProfileEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @OneToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'text', nullable: true })
  coverImageUrl!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
