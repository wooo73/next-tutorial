# 02. 데이터베이스

## 이 챕터에서 배우는 것
- Docker로 PostgreSQL 실행하기
- TypeORM으로 엔티티(테이블) 정의
- 테이블 자동 생성 (synchronize)
- 시드 데이터 넣기

---

## 1. Docker로 PostgreSQL 띄우기

### docker-compose.yml 작성

프로젝트 루트에 `docker-compose.yml`을 만든다:

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:16
    container_name: blog-db
    restart: always
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: blog
      POSTGRES_PASSWORD: blog1234
      POSTGRES_DB: blog
    volumes:
      - blog-data:/var/lib/postgresql/data

volumes:
  blog-data:
```

### 실행

```bash
docker compose up -d
```

확인:
```bash
docker compose ps
# blog-db가 running 상태면 성공

# DB 접속 테스트
docker exec -it blog-db psql -U blog -d blog
# psql 프롬프트가 뜨면 성공, \q로 나가기
```

## 2. TypeORM 설정

### 패키지 설치

```bash
npm install typeorm reflect-metadata pg
```

### tsconfig.json 수정

TypeORM은 데코레이터를 사용하므로, `tsconfig.json`에 옵션을 추가한다:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### .env 작성 (next-blog 폴더 안에 생성)

```env
# next-blog/.env
DATABASE_URL="postgresql://blog:blog1234@localhost:5432/blog"
```

> **ERP 비교**: ERP는 Supabase URL을 `.env.local`에 넣는다. 원리는 같다.

## 3. 엔티티 정의

### TypeORM 엔티티란?

클래스로 DB 테이블을 정의하는 것이다. SQL로 `CREATE TABLE` 하는 대신 TypeScript 클래스를 쓴다.

```
TypeORM 엔티티 (클래스) → (synchronize) → PostgreSQL 테이블
```

### `entities/user.entity.ts`

```typescript
// entities/user.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, type Relation,
} from 'typeorm'
import type { Post } from './post.entity'
import type { Comment } from './comment.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', unique: true })
  email: string

  @Column({ type: 'varchar' })
  password: string  // bcrypt 해시

  @Column({ type: 'varchar' })
  name: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @OneToMany('Post', 'author')
  posts: Relation<Post[]>

  @OneToMany('Comment', 'author')
  comments: Relation<Comment[]>
}
```

### `entities/category.entity.ts`

```typescript
// entities/category.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, OneToMany, type Relation,
} from 'typeorm'
import type { Post } from './post.entity'

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', unique: true })
  name: string

  @Column({ type: 'varchar', unique: true })
  slug: string  // URL용: "tech", "life"

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @OneToMany('Post', 'category')
  posts: Relation<Post[]>
}
```

### `entities/post.entity.ts`

```typescript
// entities/post.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
  type Relation,
} from 'typeorm'
import type { User } from './user.entity'
import type { Category } from './category.entity'
import type { Comment } from './comment.entity'

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  title: string

  @Column({ type: 'text' })
  content: string  // 마크다운 본문

  @Column({ type: 'boolean', default: false })
  published: boolean  // 공개 여부

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null  // soft delete

  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string

  @ManyToOne('User', 'posts')
  @JoinColumn({ name: 'author_id' })
  author: Relation<User>

  @Column({ type: 'uuid', name: 'category_id', nullable: true })
  categoryId: string | null

  @ManyToOne('Category', 'posts')
  @JoinColumn({ name: 'category_id' })
  category: Relation<Category> | null

  @OneToMany('Comment', 'post')
  comments: Relation<Comment[]>
}
```

### `entities/comment.entity.ts`

```typescript
// entities/comment.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
  type Relation,
} from 'typeorm'
import type { User } from './user.entity'
import type { Post } from './post.entity'

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  content: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string

  @ManyToOne('User', 'comments')
  @JoinColumn({ name: 'author_id' })
  author: Relation<User>

  @Column({ type: 'uuid', name: 'post_id' })
  postId: string

  @ManyToOne('Post', 'comments')
  @JoinColumn({ name: 'post_id' })
  post: Relation<Post>
}
```

### 엔티티 해설

| TypeORM 데코레이터 | SQL | 설명 |
|-------------------|-----|------|
| `@PrimaryGeneratedColumn('uuid')` | `PRIMARY KEY DEFAULT gen_random_uuid()` | 자동 UUID 생성 기본키 |
| `@Column({ unique: true })` | `UNIQUE` | 중복 불가 |
| `@CreateDateColumn()` | `DEFAULT NOW()` | 생성 시각 자동 입력 |
| `@UpdateDateColumn()` | (TypeORM이 자동 관리) | 수정할 때마다 자동 갱신 |
| `@Column({ name: 'snake_case' })` | - | 실제 컬럼명 지정 |
| `@Entity('table_name')` | - | 실제 테이블명 지정 |
| `@ManyToOne` / `@OneToMany` | `FOREIGN KEY` | 테이블 간 관계 |
| `import type` + `Relation<>` | - | 순환 참조 방지 (엔티티끼리 서로 import할 때 필수) |
| `@OneToMany('Post', 'author')` | - | 문자열로 엔티티 참조 (순환 참조 방지) |

> **ERP 비교**: ERP의 `types/supabase.ts`에 타입이 정의되고, DB 스키마는 Supabase Dashboard에서 관리한다. TypeORM은 엔티티 클래스 하나로 스키마 + 타입을 동시에 정의하는 장점이 있다.

### 테이블 관계 (ER 다이어그램)

```
User (1) ──── (N) Post
  │                 │
  │                 │
  (1)              (1)
  │                 │
  (N)              (N)
Comment          Comment

Category (1) ──── (N) Post
```

- User 1명이 여러 Post를 쓸 수 있다 (1:N)
- User 1명이 여러 Comment를 달 수 있다 (1:N)
- Post 1개에 여러 Comment가 달릴 수 있다 (1:N)
- Category 1개에 여러 Post가 속할 수 있다 (1:N)

## 4. DataSource 설정 (DB 연결)

### `lib/database.ts`

```typescript
// lib/database.ts
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { User } from '@/entities/user.entity'
import { Post } from '@/entities/post.entity'
import { Category } from '@/entities/category.entity'
import { Comment } from '@/entities/comment.entity'

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Post, Category, Comment],
  synchronize: process.env.NODE_ENV !== 'production',  // 개발 중 자동 테이블 생성
  logging: process.env.NODE_ENV !== 'production',
})

// 싱글턴: 연결을 재사용
const globalForDb = globalThis as unknown as {
  dbInitialized: boolean
}

export async function getDataSource(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize()
    globalForDb.dbInitialized = true
  }
  return AppDataSource
}

```

**왜 이렇게 복잡하게?**

Next.js 개발 서버는 코드가 바뀔 때마다 모듈을 다시 로드한다.
그때마다 `DataSource.initialize()`를 하면 DB 연결이 계속 쌓인다.
`isInitialized`를 체크해서 연결을 재사용한다.

> **ERP 비교**: ERP의 `lib/supabase.ts`도 같은 이유로 클라이언트를 싱글턴으로 만든다.

## 5. 테이블 자동 생성

TypeORM은 `synchronize: true` 옵션으로 엔티티를 기반으로 테이블을 자동 생성한다.
개발 서버를 실행하면 테이블이 자동으로 만들어진다.

```bash
npm run dev
```

```bash
# 확인: 테이블이 잘 만들어졌나
docker exec -it blog-db psql -U blog -d blog -c "\dt"

#            List of relations
#  Schema |    Name    | Type  | Owner
# --------+------------+-------+-------
#  public | categories | table | blog
#  public | comments   | table | blog
#  public | posts      | table | blog
#  public | users      | table | blog
```

> **주의**: `synchronize: true`는 개발용이다. 프로덕션에서는 마이그레이션을 사용해야 한다.

## 6. 시드 데이터

개발할 때 빈 DB로 하면 불편하니까, 테스트 데이터를 넣어두자.

### `seeds/seed.ts`

```typescript
// seeds/seed.ts
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import bcrypt from 'bcryptjs'
import { User } from '../entities/user.entity'
import { Post } from '../entities/post.entity'
import { Category } from '../entities/category.entity'
import { Comment } from '../entities/comment.entity'

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://blog:blog1234@localhost:5432/blog',
  entities: [User, Post, Category, Comment],
  synchronize: true,
})

async function main() {
  await AppDataSource.initialize()

  const userRepo = AppDataSource.getRepository(User)
  const categoryRepo = AppDataSource.getRepository(Category)
  const postRepo = AppDataSource.getRepository(Post)

  // 카테고리 생성
  const techCategory = categoryRepo.create({ name: '기술', slug: 'tech' })
  await categoryRepo.save(techCategory)

  const lifeCategory = categoryRepo.create({ name: '일상', slug: 'life' })
  await categoryRepo.save(lifeCategory)

  // 테스트 유저 생성 (비밀번호: test1234)
  const hashedPassword = await bcrypt.hash('test1234', 10)
  const user = userRepo.create({
    email: 'test@example.com',
    password: hashedPassword,
    name: '테스트 유저',
  })
  await userRepo.save(user)

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
      published: false,  // 비공개
      authorId: user.id,
    },
  ])
  await postRepo.save(posts)

  // 댓글 생성
  const commentRepo = AppDataSource.getRepository(Comment)
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
  ])
  await commentRepo.save(comments)

  console.log('시드 데이터 생성 완료!')
  await AppDataSource.destroy()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

### 시드 실행

```bash
npm install -D tsx    # TypeScript 실행기
npx tsx seeds/seed.ts
```

## 7. TypeORM 사용법 미리보기

다음 챕터에서 자세히 쓰겠지만, 맛보기:

```typescript
import { getDataSource } from '@/lib/database'
import { Post } from '@/entities/post.entity'

// 전체 조회
const ds = await getDataSource()
const postRepo = ds.getRepository(Post)
const posts = await postRepo.find()

// 조건 조회 (관계 포함)
const published = await postRepo.find({
  where: { published: true },
  relations: { author: true, category: true },  // JOIN
  order: { createdAt: 'DESC' },
})

// 단건 조회
const post = await postRepo.findOneBy({ id: 'some-uuid' })

// 생성
const newPost = postRepo.create({
  title: '새 글',
  content: '내용',
  authorId: user.id,
})
await postRepo.save(newPost)

// 수정
await postRepo.update({ id: 'some-uuid' }, { title: '수정된 제목' })

// 삭제 (soft delete)
await postRepo.update({ id: 'some-uuid' }, { deletedAt: new Date() })
```

## 정리

이 챕터에서 한 것:
1. ✅ Docker로 PostgreSQL 실행
2. ✅ TypeORM 엔티티 정의 (User, Category, Post, Comment)
3. ✅ synchronize로 테이블 자동 생성
4. ✅ DataSource 싱글턴 설정
5. ✅ 시드 데이터 생성

---

## 다음 챕터

[03. 인증 (ID/Password) →](../03-auth/README.md)
