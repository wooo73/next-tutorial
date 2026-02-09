import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  type Relation,
} from 'typeorm';
import type { User } from './user.entity';
import type { Category } from './category.entity';
import type { Comment } from './comment.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'boolean', default: false })
  published: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string;

  @ManyToOne('User', 'posts')
  @JoinColumn({ name: 'author_id' })
  author: Relation<User>;

  @Column({ type: 'uuid', name: 'category_id', nullable: true })
  categoryId: string | null;

  @ManyToOne('Category', 'posts')
  @JoinColumn({ name: 'category_id' })
  category: Relation<Category> | null;

  @OneToMany('Comment', 'post')
  comments: Relation<Comment[]>;
}
