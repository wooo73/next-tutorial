// seeds/seed.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Post } from '../entities/post.entity';
import { Category } from '../entities/category.entity';
import { Comment } from '../entities/comment.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://blog:blog1234@localhost:5432/blog',
  entities: [User, Post, Category, Comment],
  synchronize: true,
});

async function main() {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const categoryRepo = AppDataSource.getRepository(Category);
  const postRepo = AppDataSource.getRepository(Post);

  // 카테고리 생성
  const techCategory = categoryRepo.create({ name: '기술', slug: 'tech' });
  await categoryRepo.save(techCategory);

  const lifeCategory = categoryRepo.create({ name: '일상', slug: 'life' });
  await categoryRepo.save(lifeCategory);

  // 테스트 유저 생성 (비밀번호: test1234)
  const hashedPassword = await bcrypt.hash('test1234', 10);
  const user = userRepo.create({
    email: 'test@example.com',
    password: hashedPassword,
    name: '테스트 유저',
  });
  await userRepo.save(user);

  // 게시글 생성
  const posts = postRepo.create([
    {
      title: 'Next.js 시작하기',
      content: '# Next.js란?\n\nReact 기반의 풀스택 프레임워크입니다.',
      published: true,
      authorId: user.id,
      categoryId: techCategory.id,
    },
    {
      title: 'TypeScript 기초',
      content: '# TypeScript\n\n타입이 있는 JavaScript입니다.',
      published: true,
      authorId: user.id,
      categoryId: techCategory.id,
    },
    {
      title: '오늘의 일기',
      content: '오늘은 날씨가 좋았다.',
      published: true,
      authorId: user.id,
      categoryId: lifeCategory.id,
    },
    {
      title: '임시저장 글',
      content: '아직 작성 중...',
      published: false, // 비공개
      authorId: user.id,
    },
  ]);
  await postRepo.save(posts);

  // 댓글 생성
  const commentRepo = AppDataSource.getRepository(Comment);
  const comments = commentRepo.create([
    {
      content: '좋은 글이네요! 감사합니다.',
      authorId: user.id,
      postId: posts[0].id,
    },
    {
      content: 'TypeScript 정말 유용하죠!',
      authorId: user.id,
      postId: posts[1].id,
    },
  ]);
  await commentRepo.save(comments);

  console.log('시드 데이터 생성 완료!');
  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
