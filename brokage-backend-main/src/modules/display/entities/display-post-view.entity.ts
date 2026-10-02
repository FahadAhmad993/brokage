import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

/**
 * One row per (post, visitor). The unique index is what guarantees a person
 * who opens the same ad ten times is still counted exactly once — "20
 * visitors" always means 20 distinct users.
 */
@Entity('display_post_views')
@Index('UQ_display_post_views_post_user', ['postId', 'userId'], {
  unique: true,
})
export class DisplayPostViewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  postId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
