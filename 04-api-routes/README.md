# 04. API 라우트

## 이 챕터에서 배우는 것
- Next.js API Route Handler 작성법
- RESTful API 설계 (GET, POST, PUT, DELETE)
- Next.js 15의 params가 Promise인 이유
- 인증된 유저만 허용하는 API 만들기

---

## 1. Next.js API Route 기본

### 파일 위치 = URL

```
app/api/posts/route.ts          → /api/posts
app/api/posts/[id]/route.ts     → /api/posts/:id
app/api/categories/route.ts     → /api/categories
```

### route.ts 안에 HTTP 메서드 함수를 export 한다

```typescript
// app/api/posts/route.ts
export async function GET(request: NextRequest) { ... }   // 목록 조회
export async function POST(request: NextRequest) { ... }  // 생성
```

```typescript
// app/api/posts/[id]/route.ts
export async function GET(request: NextRequest, context) { ... }     // 단건 조회
export async function PUT(request: NextRequest, context) { ... }     // 수정
export async function DELETE(request: NextRequest, context) { ... }  // 삭제
```

> **ERP 비교**: ERP의 `app/api/companies/route.ts`, `app/api/companies/[id]/route.ts`와 정확히 같은 패턴이다.

## 2. 게시글 Zod 스키마 추가

### `lib/validations.ts`에 추가

```typescript
// lib/validations.ts (기존 auth 스키마에 추가)

export const createPostSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200, '제목은 200자 이하'),
  content: z.string().min(1, '내용을 입력하세요'),
  categoryId: z.string().uuid().optional(),
  published: z.boolean().default(false),
})

export const updatePostSchema = createPostSchema.partial()
// partial() = 모든 필드가 optional이 된다

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
```

## 3. 인증 헬퍼

API에서 반복되는 인증 체크를 함수로 만든다.

### `lib/api-utils.ts`

```typescript
// lib/api-utils.ts
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function requireAuth() {
  const user = await getAuthUser()
  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 },
      ),
    }
  }
  return { user, error: null }
}
```

## 4. 게시글 목록 + 작성 API

### `app/api/posts/route.ts`

```typescript
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDataSource } from '@/lib/database'
import { Post } from '@/entities/post.entity'
import { requireAuth } from '@/lib/api-utils'
import { createPostSchema } from '@/lib/validations'

// ─── 게시글 목록 조회 ─────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const categoryId = searchParams.get('categoryId')

  const ds = await getDataSource()
  const postRepo = ds.getRepository(Post)

  // where 조건 만들기
  const where: Record<string, unknown> = {
    published: true,
    deletedAt: IsNull(),                  // soft delete된 글 제외
    ...(categoryId && { categoryId }),    // 카테고리 필터 (있을 때만)
  }

  // 병렬로 데이터 + 총 개수 조회
  const [posts, total] = await postRepo.findAndCount({
    where,
    relations: { author: true, category: true },
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  })

  return NextResponse.json({
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

// ─── 게시글 작성 ──────────────────────────
export async function POST(request: NextRequest) {
  // 1. 인증 확인
  const { user, error } = await requireAuth()
  if (error) return error

  try {
    // 2. 입력값 검증
    const body = await request.json()
    const result = createPostSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      )
    }

    // 3. DB에 저장
    const ds = await getDataSource()
  const postRepo = ds.getRepository(Post)
    const post = postRepo.create({
      ...result.data,
      authorId: user.userId,
    })
    await postRepo.save(post)

    // 관계 데이터 포함해서 다시 조회
    const saved = await postRepo.findOne({
      where: { id: post.id },
      relations: { author: true, category: true },
    })

    return NextResponse.json({ post: saved }, { status: 201 })

  } catch (error) {
    console.error('게시글 작성 에러:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
```

## 5. 게시글 상세/수정/삭제 API

### ⚠️ Next.js 15 주의사항: params는 Promise!

```typescript
// ❌ Next.js 14 (구버전)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
}

// ✅ Next.js 15 (우리가 쓸 것)
interface RouteContext {
  params: Promise<{ id: string }>  // Promise!
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params  // await!
}
```

> **ERP 비교**: ERP의 CLAUDE.md에도 이 내용이 "CRITICAL"로 강조되어 있다. Next.js 15의 가장 큰 breaking change다.

### `app/api/posts/[id]/route.ts`

```typescript
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { IsNull } from 'typeorm'
import { getDataSource } from '@/lib/database'
import { Post } from '@/entities/post.entity'
import { requireAuth } from '@/lib/api-utils'
import { updatePostSchema } from '@/lib/validations'

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── 게시글 상세 조회 ─────────────────────
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  const ds = await getDataSource()
  const postRepo = ds.getRepository(Post)
  const post = await postRepo.findOne({
    where: { id, deletedAt: IsNull() },
    relations: {
      author: true,
      category: true,
      comments: { author: true },
    },
    order: { comments: { createdAt: 'DESC' } },
  })

  if (!post) {
    return NextResponse.json(
      { error: '게시글을 찾을 수 없습니다' },
      { status: 404 },
    )
  }

  return NextResponse.json({ post })
}

// ─── 게시글 수정 ──────────────────────────
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const { user, error } = await requireAuth()
  if (error) return error

  // 게시글 존재 + 작성자 확인
  const ds = await getDataSource()
  const postRepo = ds.getRepository(Post)
  const existing = await postRepo.findOneBy({ id })
  if (!existing || existing.deletedAt) {
    return NextResponse.json(
      { error: '게시글을 찾을 수 없습니다' },
      { status: 404 },
    )
  }
  if (existing.authorId !== user.userId) {
    return NextResponse.json(
      { error: '수정 권한이 없습니다' },
      { status: 403 },
    )
  }

  const body = await request.json()
  const result = updatePostSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0].message },
      { status: 400 },
    )
  }

  await postRepo.update({ id }, result.data)

  const post = await postRepo.findOne({
    where: { id },
    relations: { author: true, category: true },
  })

  return NextResponse.json({ post })
}

// ─── 게시글 삭제 (soft delete) ────────────
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const { user, error } = await requireAuth()
  if (error) return error

  const ds = await getDataSource()
  const postRepo = ds.getRepository(Post)
  const existing = await postRepo.findOneBy({ id })
  if (!existing || existing.deletedAt) {
    return NextResponse.json(
      { error: '게시글을 찾을 수 없습니다' },
      { status: 404 },
    )
  }
  if (existing.authorId !== user.userId) {
    return NextResponse.json(
      { error: '삭제 권한이 없습니다' },
      { status: 403 },
    )
  }

  // soft delete: 실제로 지우지 않고 deletedAt만 설정
  await postRepo.update({ id }, { deletedAt: new Date() })

  return NextResponse.json({ message: '삭제되었습니다' })
}
```

> **ERP 비교**: ERP도 `deleted_at`으로 soft delete한다.

## 6. 카테고리 API

### `app/api/categories/route.ts`

```typescript
// app/api/categories/route.ts
import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/database'
import { Category } from '@/entities/category.entity'

export async function GET() {
  const ds = await getDataSource()
  const categoryRepo = ds.getRepository(Category)
  const categories = await categoryRepo.find({
    relations: { posts: true },
    order: { name: 'ASC' },
  })

  // 게시글 수를 포함해서 응답
  const result = categories.map(cat => ({
    ...cat,
    _count: { posts: cat.posts?.length ?? 0 },
    posts: undefined,  // 게시글 전체 데이터는 제외
  }))

  return NextResponse.json({ categories: result })
}
```

## 7. API 설계 요약

| 엔드포인트 | 메서드 | 인증 | 설명 |
|-----------|--------|:----:|------|
| `/api/auth/register` | POST | ❌ | 회원가입 |
| `/api/auth/login` | POST | ❌ | 로그인 |
| `/api/auth/logout` | POST | ❌ | 로그아웃 |
| `/api/auth/me` | GET | ✅ | 현재 유저 |
| `/api/posts` | GET | ❌ | 게시글 목록 |
| `/api/posts` | POST | ✅ | 게시글 작성 |
| `/api/posts/[id]` | GET | ❌ | 게시글 상세 |
| `/api/posts/[id]` | PUT | ✅ | 게시글 수정 (작성자만) |
| `/api/posts/[id]` | DELETE | ✅ | 게시글 삭제 (작성자만) |
| `/api/categories` | GET | ❌ | 카테고리 목록 |

## 8. 에러 처리 패턴 정리

```typescript
// 항상 이 패턴을 따른다:

// 1. 입력값 검증 실패 → 400
{ error: '제목을 입력하세요' }

// 2. 인증 실패 → 401
{ error: '로그인이 필요합니다' }

// 3. 권한 없음 → 403
{ error: '수정 권한이 없습니다' }

// 4. 리소스 없음 → 404
{ error: '게시글을 찾을 수 없습니다' }

// 5. 중복 → 409
{ error: '이미 가입된 이메일입니다' }

// 6. 서버 에러 → 500
{ error: '서버 오류가 발생했습니다' }
```

> **ERP 비교**: ERP의 API도 동일한 HTTP 상태코드 패턴을 사용한다. `NextResponse.json()`으로 일관된 JSON 응답을 반환한다.

## 정리

이 챕터에서 한 것:
1. ✅ 게시글 CRUD API (목록/상세/작성/수정/삭제)
2. ✅ Next.js 15 params Promise 처리
3. ✅ Zod 입력값 검증
4. ✅ 인증 헬퍼로 로그인 유저 확인
5. ✅ soft delete 패턴
6. ✅ 페이지네이션 (skip/take)

---

## 다음 챕터

[05. 페이지 구현 →](../05-pages/README.md)
