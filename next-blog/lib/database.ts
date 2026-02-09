import { DataSource } from 'typeorm';
import { User } from '@/entities/user.entity';
import { Post } from '@/entities/post.entity';
import { Category } from '@/entities/category.entity';
import { Comment } from '@/entities/comment.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Post, Category, Comment],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
});

export async function getDataSource(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}
export default AppDataSource;
