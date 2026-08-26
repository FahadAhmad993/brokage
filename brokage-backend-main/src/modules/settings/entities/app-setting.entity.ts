import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** One custom field an admin has added to the community-ad post form. */
export type CustomPostField = {
  /** Stable key used in `community_posts.extraFields`, e.g. "bedrooms". */
  key: string;
  /** Label shown on the form, e.g. "Bedrooms". */
  label: string;
  type: 'text' | 'number';
  required: boolean;
};

@Entity('app_settings')
export class AppSettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32, unique: true, default: 'default' })
  key!: string;

  /** PKR charged per hour an ad runs — replaces the old hardcoded flat rate. */
  @Column({ type: 'numeric', precision: 10, scale: 4, default: 2.0833 })
  pricePerHourPkr!: number;

  @Column({ type: 'int', default: 2 })
  minImages!: number;

  @Column({ type: 'int', default: 6 })
  maxImages!: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  customFields!: CustomPostField[];

  @Column({ type: 'boolean', default: true })
  cityRequired!: boolean;

  @Column({ type: 'boolean', default: true })
  areaRequired!: boolean;

  /**
   * How many days a chat message (community group chat OR private DM)
   * lives before `ChatRetentionService`'s daily sweep permanently deletes
   * it from Postgres. Admin-editable via `PATCH /admin/settings`.
   */
  @Column({ type: 'int', default: 20 })
  chatRetentionDays!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
