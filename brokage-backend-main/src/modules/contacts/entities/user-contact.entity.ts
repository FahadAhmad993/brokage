import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * A person saved in someone's personal contact list — like adding a number
 * on WhatsApp, except the key is the other user's EMAIL (phone is only an
 * optional note). One row per (owner → contact).
 */
@Entity('user_contacts')
@Unique('UQ_user_contacts_owner_contact', ['ownerId', 'contactUserId'])
export class UserContactEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: UserEntity;

  @Index()
  @Column({ type: 'uuid' })
  contactUserId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactUserId' })
  contactUser!: UserEntity;

  /** The owner's own label for this person (defaults to their profile name). */
  @Column({ type: 'varchar', length: 100, nullable: true })
  name!: string | null;

  /** Optional phone number the owner wants to keep next to the contact. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
