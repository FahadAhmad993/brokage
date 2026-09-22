import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * A post on a broker's personal "Display" — their own portfolio/storefront
 * page (Profile → Display), separate from both `PropertyEntity` (free
 * listings under "My Listings") and `CommunityPostEntity` (the community
 * feed's paid ads). Modelled closely on `CommunityPostEntity`'s proven
 * shape (images, paid duration, admin verification) since the two are
 * priced and moderated the same way, but kept as its own table/product so
 * Display management never gets mixed up with the Community feed.
 */
@Entity('display_posts')
export class DisplayPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  /** Carousel photos for this post — up to 7 per the product spec. */
  @Column({ type: 'jsonb' })
  images!: string[];

  /** The one required spec field — plot/house size in Marla. */
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  marlaSize!: number;

  /** Optional — where the plot/house is. Free text, same as the Community feed's city/area fields. */
  @Column({ type: 'text', nullable: true })
  city!: string | null;

  @Column({ type: 'text', nullable: true })
  area!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Everything else (bedrooms, bathrooms, kitchen, carporch, tv lounge,
   * ...) is optional and freely skippable — kept as flexible key→value
   * answers rather than fixed columns, same reasoning as
   * `CommunityPostEntity.extraFields`.
   */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  extraFields!: Record<string, string>;

  /** How many hours this post runs once verified. Price is computed server-side from this. */
  @Column({ type: 'int', default: 24 })
  durationHours!: number;

  /** PKR price for `durationHours` — computed server-side, never client input. */
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  price!: number;

  /** pending -> active (admin verified) -> sold | expired | rejected */
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: 'pending' | 'active' | 'sold' | 'expired' | 'rejected';

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt!: Date | null;

  /** verifiedAt + durationHours — post stops showing (unless sold) once this passes. */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  /** Set when the owner taps "Sold" — the post keeps showing (with a SOLD badge) until `expiresAt`. */
  @Column({ type: 'timestamp', nullable: true })
  soldAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
