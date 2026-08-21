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
import { UserEntity } from '../../users/entities/user.entity';
import { PropertyCategory } from '../../../common/enums/property-category.enum';
import { PropertyImageEntity } from './property-image.entity';

@Entity('properties')
export class PropertyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  title!: string;

  @Index()
  @Column()
  location!: string;

  /** Indexed because the listings endpoint filters/orders by price. */
  @Index()
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  priceMonthly!: number;

  @Column({ type: 'enum', enum: PropertyCategory })
  category!: PropertyCategory;

  @Column({ default: false })
  isPremium!: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  features!: string[];

  @Column({ default: true })
  isPublished!: boolean;

  @Index()
  @Column()
  hostId!: string;

  @ManyToOne(() => UserEntity, (user) => user.properties, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'hostId' })
  host!: UserEntity;

  @OneToMany(() => PropertyImageEntity, (image) => image.property, {
    cascade: true,
  })
  images!: PropertyImageEntity[];

  /** Default listing sort is "newest first" — index makes that O(log n)
   *  even as the properties table grows. */
  @Index()
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
