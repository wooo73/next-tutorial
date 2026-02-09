import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { User } from '../entities/user.entity'
import { Post } from '../entities/post.entity'
import { Category } from '../entities/category.entity'
import { Comment } from '../entities/comment.entity'

const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://blog:blog1234@localhost:5432/blog',
  entities: [User, Post, Category, Comment],
  synchronize: true,
})

async function main() {
  await ds.initialize()
  console.log('테이블 생성 완료!')
  await ds.destroy()
}

main().catch(console.error)
