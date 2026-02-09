# 05. 페이지 구현

## 이 챕터에서 배우는 것
- 서버 컴포넌트에서 직접 DB 조회하기
- 클라이언트 컴포넌트에서 API 호출하기
- 동적 라우트 ([id]) 사용법
- 레이아웃으로 공통 UI 만들기

---

## 1. 레이아웃 (네비게이션 바)

### `components/navbar.tsx`

```tsx
// components/navbar.tsx
"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
}

export function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data?.user || null))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="border-b">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold">
          내 블로그
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/posts">게시글</Link>
          {user ? (
            <>
              <Link href="/posts/new">
                <Button size="sm">글 쓰기</Button>
              </Link>
              <span className="text-sm text-gray-600">{user.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                로그아웃
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">로그인</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">회원가입</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
```

### `app/layout.tsx` 수정

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/navbar'

export const metadata: Metadata = {
  title: '내 블로그',
  description: 'Next.js로 만든 블로그',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
```

## 2. 홈페이지 (서버 컴포넌트)

```tsx
// app/page.tsx
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// 서버 컴포넌트! "use client" 없음 → DB 직접 조회 가능
export default async function HomePage() {
  // API 호출 없이 직접 DB 조회
  const recentPosts = await prisma.post.findMany({
    where: { published: true, deletedAt: null },
    include: {
      author: { select: { name: true } },
      category: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">최근 게시글</h1>

      <div className="space-y-4">
        {recentPosts.map(post => (
          <Link href={`/posts/${post.id}`} key={post.id}>
            <Card className="hover:bg-gray-50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  {post.category && (
                    <Badge variant="secondary">{post.category.name}</Badge>
                  )}
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                </div>
                <CardDescription>
                  {post.author.name} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {recentPosts.length === 0 && (
        <p className="text-gray-500">아직 게시글이 없습니다.</p>
      )}
    </div>
  )
}
```

**핵심**: `await prisma.post.findMany()`를 직접 호출한다.
서버 컴포넌트이기 때문에 `fetch('/api/posts')` 없이 DB에 바로 접근 가능하다.

> **ERP 비교**: ERP의 회사 목록 페이지도 서버 컴포넌트에서 Supabase를 직접 조회한다. API route를 거치지 않는다.

## 3. 게시글 목록 페이지

### `app/posts/page.tsx` (서버 컴포넌트)

```tsx
// app/posts/page.tsx
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PageProps {
  searchParams: Promise<{ page?: string; categoryId?: string }>
}

export default async function PostsPage({ searchParams }: PageProps) {
  const { page: pageStr, categoryId } = await searchParams  // Next.js 15: await!
  const page = parseInt(pageStr || '1')
  const limit = 10

  const where = {
    published: true,
    deletedAt: null,
    ...(categoryId && { categoryId }),
  }

  const [posts, total, categories] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { name: true } },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">게시글</h1>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-6">
        <Link href="/posts">
          <Badge variant={!categoryId ? 'default' : 'outline'}>전체</Badge>
        </Link>
        {categories.map(cat => (
          <Link href={`/posts?categoryId=${cat.id}`} key={cat.id}>
            <Badge variant={categoryId === cat.id ? 'default' : 'outline'}>
              {cat.name}
            </Badge>
          </Link>
        ))}
      </div>

      {/* 게시글 목록 */}
      <div className="space-y-4">
        {posts.map(post => (
          <Link href={`/posts/${post.id}`} key={post.id}>
            <Card className="hover:bg-gray-50 transition-colors">
              <CardHeader>
                <CardTitle>{post.title}</CardTitle>
                <CardDescription>
                  {post.author.name} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 line-clamp-2">
                  {post.content.substring(0, 150)}...
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`/posts?page=${p}${categoryId ? `&categoryId=${categoryId}` : ''}`}
            >
              <Badge variant={p === page ? 'default' : 'outline'}>{p}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

> **참고**: `searchParams`도 Next.js 15에서는 **Promise**다. `await searchParams` 필수!

## 4. 게시글 상세 페이지

### `app/posts/[id]/page.tsx` (서버 컴포넌트)

```tsx
// app/posts/[id]/page.tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PostActions } from './post-actions'  // 클라이언트 컴포넌트
import { getAuthUser } from '@/lib/auth'

interface PageProps {
  params: Promise<{ id: string }>   // Next.js 15: Promise!
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = await params  // await!

  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
    include: {
      author: { select: { id: true, name: true } },
      category: true,
      comments: {
        include: {
          author: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!post) {
    notFound()  // 404 페이지 보여줌
  }

  const currentUser = await getAuthUser()
  const isAuthor = currentUser?.userId === post.authorId

  return (
    <article>
      {/* 헤더 */}
      <div className="mb-8">
        {post.category && (
          <Badge className="mb-2">{post.category.name}</Badge>
        )}
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <p className="mt-2 text-gray-500">
          {post.author.name} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
        </p>

        {/* 수정/삭제 버튼 (작성자만) */}
        {isAuthor && <PostActions postId={post.id} />}
      </div>

      <Separator className="my-6" />

      {/* 본문 */}
      <div className="prose max-w-none">
        {post.content}
      </div>

      <Separator className="my-6" />

      {/* 댓글 영역 */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          댓글 ({post.comments.length})
        </h2>
        {post.comments.map(comment => (
          <div key={comment.id} className="border rounded-lg p-4 mb-3">
            <p className="text-sm text-gray-500 mb-1">
              {comment.author.name} · {new Date(comment.createdAt).toLocaleDateString('ko-KR')}
            </p>
            <p>{comment.content}</p>
          </div>
        ))}
      </section>
    </article>
  )
}
```

### `app/posts/[id]/post-actions.tsx` (클라이언트 컴포넌트)

수정/삭제 버튼은 onClick이 필요하니까 클라이언트 컴포넌트로 분리한다.

```tsx
// app/posts/[id]/post-actions.tsx
"use client"

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function PostActions({ postId }: { postId: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/posts')
      router.refresh()
    }
  }

  return (
    <div className="flex gap-2 mt-4">
      <Link href={`/posts/${postId}/edit`}>
        <Button variant="outline" size="sm">수정</Button>
      </Link>
      <Button variant="destructive" size="sm" onClick={handleDelete}>
        삭제
      </Button>
    </div>
  )
}
```

> **핵심 패턴**: 서버 컴포넌트(데이터 조회) + 클라이언트 컴포넌트(상호작용)를 분리한다.
> ERP도 이 패턴을 사용한다.

## 5. 로그인 페이지

### `app/login/page.tsx` (클라이언트 컴포넌트)

```tsx
// app/login/page.tsx
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('서버 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center mt-20">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-3 rounded">{error}</p>
            )}
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </Button>
            <p className="text-sm text-gray-500">
              계정이 없나요? <Link href="/register" className="text-blue-600 hover:underline">회원가입</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
```

## 6. 서버 컴포넌트 vs 클라이언트 컴포넌트 정리

이 챕터에서 사용한 패턴:

| 페이지 | 타입 | 이유 |
|--------|------|------|
| `app/page.tsx` (홈) | 서버 | DB 직접 조회, 상호작용 없음 |
| `app/posts/page.tsx` (목록) | 서버 | DB 조회 + searchParams |
| `app/posts/[id]/page.tsx` (상세) | 서버 | DB 조회 + params |
| `app/posts/[id]/post-actions.tsx` | **클라이언트** | onClick 이벤트 필요 |
| `app/login/page.tsx` | **클라이언트** | useState, onSubmit 필요 |
| `components/navbar.tsx` | **클라이언트** | useState, onClick 필요 |

## 정리

이 챕터에서 한 것:
1. ✅ 네비게이션 바 (로그인 상태 표시)
2. ✅ 홈페이지 (서버 컴포넌트, DB 직접 조회)
3. ✅ 게시글 목록 (카테고리 필터, 페이지네이션)
4. ✅ 게시글 상세 (댓글 포함, 작성자만 수정/삭제)
5. ✅ 로그인/회원가입 페이지 (클라이언트 컴포넌트)
6. ✅ 서버/클라이언트 컴포넌트 분리 패턴

---

## 다음 챕터

[06. 컴포넌트 심화 →](../06-components/README.md)
