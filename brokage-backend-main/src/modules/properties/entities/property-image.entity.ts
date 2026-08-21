import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PropertyEntity } from './property.entity';

@Entity('property_images')
export class PropertyImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  propertyId!: string;

  @ManyToOne(() => PropertyEntity, (property) => property.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'propertyId' })
  property!: PropertyEntity;

  @Column()
  url!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
