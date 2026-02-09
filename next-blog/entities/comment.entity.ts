import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import type { User } from './user.entity';
import type { Post } from './post.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string;

  @ManyToOne('User', 'comments')
  @JoinColumn({ name: 'author_id' })
  author: Relation<User>;

  @Column({ type: 'uuid', name: 'post_id' })
  postId: string;

  @ManyToOne('Post', 'comments')
  @JoinColumn({ name: 'post_id' })
  post: Relation<Post>;
}
