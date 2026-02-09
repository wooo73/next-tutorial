# 02. 데이터베이스

## 이 챕터에서 배우는 것
- Docker로 PostgreSQL 실행하기
- Prisma ORM으로 DB 스키마 정의
- 테이블 생성 (마이그레이션)
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

## 2. Prisma 설정

### Prisma 초기화

```bash
npx prisma init
```

두 가지 파일이 생긴다:
- `prisma/schema.prisma` - DB 스키마 정의
- `.env` - DB 연결 정보

### .env 수정

```env
# .env
DATABASE_URL="postgresql://blog:blog1234@localhost:5432/blog"
```

> **ERP 비교**: ERP는 Supabase URL을 `.env.local`에 넣는다. 원리는 같다.

## 3. 스키마 정의

### Prisma 스키마란?

코드로 DB 테이블을 정의하는 것이다. SQL로 `CREATE TABLE` 하는 대신 Prisma 문법을 쓴다.

```
Prisma 스키마 → (마이그레이션) → PostgreSQL 테이블
```

### `prisma/schema.prisma`

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── 사용자 ────────────────────────────
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String                        // bcrypt 해시
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  posts    Post[]
  comments Comment[]

  @@map("users")  // 실제 테이블명은 snake_case
}

// ─── 카테고리 ───────────────────────────
model Category {
  id        String   @id @default(uuid())
  name      String   @unique
  slug      String   @unique             // URL용: "tech", "life"
  createdAt DateTime @default(now()) @map("created_at")

  posts Post[]

  @@map("categories")
}

// ─── 게시글 ────────────────────────────
model Post {
  id          String    @id @default(uuid())
  title       String
  content     String                       // 마크다운 본문
  published   Boolean   @default(false)    // 공개 여부
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at") // soft delete

  authorId   String   @map("author_id")
  author     User     @relation(fields: [authorId], references: [id])

  categoryId String?  @map("category_id")
  category   Category? @relation(fields: [categoryId], references: [id])

  comments Comment[]

  @@map("posts")
}

// ─── 댓글 ──────────────────────────────
model Comment {
  id        String   @id @default(uuid())
  content   String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  authorId String @map("author_id")
  author   User   @relation(fields: [authorId], references: [id])

  postId String @map("post_id")
  post   Post   @relation(fields: [postId], references: [id])

  @@map("comments")
}
```

### 스키마 해설

| Prisma | SQL | 설명 |
|--------|-----|------|
| `@id` | `PRIMARY KEY` | 기본키 |
| `@default(uuid())` | `DEFAULT gen_random_uuid()` | 자동 UUID 생성 |
| `@unique` | `UNIQUE` | 중복 불가 |
| `@default(now())` | `DEFAULT NOW()` | 생성 시각 자동 입력 |
| `@updatedAt` | (Prisma가 자동 관리) | 수정할 때마다 자동 갱신 |
| `@map("snake_case")` | - | 실제 컬럼명 지정 |
| `@@map("table_name")` | - | 실제 테이블명 지정 |
| `@relation` | `FOREIGN KEY` | 테이블 간 관계 |

> **ERP 비교**: ERP의 `types/supabase.ts`에 타입이 정의되고, DB 스키마는 Supabase Dashboard에서 관리한다. Prisma는 스키마 + 타입을 한 파일에서 관리하는 장점이 있다.

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

## 4. 마이그레이션 (테이블 생성)

```bash
npx prisma migrate dev --name init
```

이 명령어가 하는 것:
1. `schema.prisma`를 읽는다
2. SQL로 변환한다 (`prisma/migrations/` 폴더에 저장)
3. PostgreSQL에 테이블을 만든다
4. Prisma Client를 생성한다 (TypeScript 타입 자동 생성)

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

## 5. Prisma Client 설정

### `lib/prisma.ts`

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**왜 이렇게 복잡하게?**

Next.js 개발 서버는 코드가 바뀔 때마다 모듈을 다시 로드한다.
그때마다 `new PrismaClient()`를 하면 DB 연결이 계속 쌓인다.
`globalThis`에 저장하면 연결을 재사용한다.

> **ERP 비교**: ERP의 `lib/supabase.ts`도 같은 이유로 클라이언트를 싱글턴으로 만든다.

## 6. 시드 데이터

개발할 때 빈 DB로 하면 불편하니까, 테스트 데이터를 넣어두자.

### `prisma/seed.ts`

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 카테고리 생성
  const techCategory = await prisma.category.create({
    data: { name: '기술', slug: 'tech' },
  })
  const lifeCategory = await prisma.category.create({
    data: { name: '일상', slug: 'life' },
  })

  // 테스트 유저 생성 (비밀번호: test1234)
  const hashedPassword = await bcrypt.hash('test1234', 10)
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: hashedPassword,
      name: '테스트 유저',
    },
  })

  // 게시글 생성
  await prisma.post.createMany({
    data: [
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
    ],
  })

  console.log('시드 데이터 생성 완료!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### package.json에 시드 스크립트 추가

```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

### 시드 실행

```bash
npm install -D tsx    # TypeScript 실행기
npx prisma db seed
```

## 7. Prisma Studio (DB 시각적 확인)

```bash
npx prisma studio
```

브라우저에서 `http://localhost:5555`가 열린다.
테이블과 데이터를 시각적으로 확인/수정할 수 있다.

## 8. Prisma 사용법 미리보기

다음 챕터에서 자세히 쓰겠지만, 맛보기:

```typescript
import { prisma } from '@/lib/prisma'

// 전체 조회
const posts = await prisma.post.findMany()

// 조건 조회
const published = await prisma.post.findMany({
  where: { published: true },
  include: { author: true, category: true },  // JOIN
  orderBy: { createdAt: 'desc' },
})

// 단건 조회
const post = await prisma.post.findUnique({
  where: { id: 'some-uuid' },
})

// 생성
const newPost = await prisma.post.create({
  data: {
    title: '새 글',
    content: '내용',
    authorId: user.id,
  },
})

// 수정
await prisma.post.update({
  where: { id: 'some-uuid' },
  data: { title: '수정된 제목' },
})

// 삭제 (soft delete)
await prisma.post.update({
  where: { id: 'some-uuid' },
  data: { deletedAt: new Date() },
})
```

## 정리

이 챕터에서 한 것:
1. ✅ Docker로 PostgreSQL 실행
2. ✅ Prisma 스키마 정의 (User, Category, Post, Comment)
3. ✅ 마이그레이션으로 테이블 생성
4. ✅ Prisma Client 싱글턴 설정
5. ✅ 시드 데이터 생성

---

## 다음 챕터

[03. 인증 (ID/Password) →](../03-auth/README.md)
