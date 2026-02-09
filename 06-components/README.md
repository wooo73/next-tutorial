# 06. 컴포넌트 심화

## 이 챕터에서 배우는 것
- React Hook Form + Zod로 폼 만들기
- 게시글 작성/수정 폼
- `router.refresh()`로 서버 컴포넌트 갱신하기

---

## 1. React Hook Form + Zod

### 왜 React Hook Form을 쓰나?

```tsx
// ❌ 직접 관리: 필드마다 useState, onChange, 검증 로직...
const [title, setTitle] = useState('')
const [content, setContent] = useState('')
const [error, setError] = useState('')

// ✅ React Hook Form: 한 번에 관리
const { register, handleSubmit, formState: { errors } } = useForm()
```

### Zod + React Hook Form 연동

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPostSchema, type CreatePostInput } from '@/lib/validations'

const form = useForm<CreatePostInput>({
  resolver: zodResolver(createPostSchema),  // Zod가 자동 검증
  defaultValues: {
    title: '',
    content: '',
    published: false,
  },
})

// form.register('title') → input에 연결
// form.formState.errors.title?.message → 에러 메시지 자동 표시
```

> **ERP 비교**: ERP의 모든 폼이 이 조합(React Hook Form + Zod + zodResolver)을 사용한다.

## 2. 게시글 작성 페이지

### `app/posts/new/page.tsx`

```tsx
// app/posts/new/page.tsx
"use client"

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPostSchema, type CreatePostInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { useEffect, useState } from 'react'

interface Category {
  id: string
  name: string
}

export default function NewPostPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])

  const form = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: '',
      content: '',
      published: false,
    },
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form

  // 카테고리 목록 가져오기
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories))
  }, [])

  const onSubmit = async (data: CreatePostInput) => {
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error)
        return
      }

      const { post } = await res.json()
      router.push(`/posts/${post.id}`)
      router.refresh()
    } catch {
      alert('서버 오류가 발생했습니다')
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>새 게시글 작성</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* 제목 */}
          <div>
            <Label htmlFor="title">제목</Label>
            <Input id="title" {...register('title')} />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* 카테고리 */}
          <div>
            <Label htmlFor="categoryId">카테고리</Label>
            <select
              id="categoryId"
              {...register('categoryId')}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">선택 안 함</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* 내용 */}
          <div>
            <Label htmlFor="content">내용 (마크다운)</Label>
            <Textarea
              id="content"
              rows={15}
              {...register('content')}
              placeholder="마크다운으로 작성하세요..."
            />
            {errors.content && (
              <p className="text-sm text-red-500 mt-1">{errors.content.message}</p>
            )}
          </div>

          {/* 공개 여부 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              {...register('published')}
              className="rounded"
            />
            <Label htmlFor="published">바로 공개하기</Label>
          </div>
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '작성'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
```

## 3. 게시글 수정 페이지

### `app/posts/[id]/edit/page.tsx`

```tsx
// app/posts/[id]/edit/page.tsx
"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updatePostSchema, type UpdatePostInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'

export default function EditPostPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string
  const [loading, setLoading] = useState(true)

  const form = useForm<UpdatePostInput>({
    resolver: zodResolver(updatePostSchema),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = form

  // 기존 데이터 불러오기
  useEffect(() => {
    fetch(`/api/posts/${postId}`)
      .then(res => res.json())
      .then(data => {
        reset({
          title: data.post.title,
          content: data.post.content,
          categoryId: data.post.categoryId || undefined,
          published: data.post.published,
        })
        setLoading(false)
      })
  }, [postId, reset])

  const onSubmit = async (data: UpdatePostInput) => {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      router.push(`/posts/${postId}`)
      router.refresh()
    } else {
      const error = await res.json()
      alert(error.error)
    }
  }

  if (loading) return <p>로딩 중...</p>

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>게시글 수정</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">제목</Label>
            <Input id="title" {...register('title')} />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="content">내용</Label>
            <Textarea id="content" rows={15} {...register('content')} />
            {errors.content && (
              <p className="text-sm text-red-500 mt-1">{errors.content.message}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="published" {...register('published')} />
            <Label htmlFor="published">공개하기</Label>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '수정'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
```

## 4. `router.refresh()` 이해하기

```tsx
router.push(`/posts/${post.id}`)  // 페이지 이동
router.refresh()                   // 서버 컴포넌트 재실행 (DB 다시 조회)
```

**왜 필요한가?**

Next.js는 서버 컴포넌트의 결과를 **캐싱**한다.
글을 작성한 후 목록으로 돌아가면, 캐시된 이전 목록이 보일 수 있다.
`router.refresh()`는 캐시를 무효화하고 서버 컴포넌트를 다시 실행시킨다.

```
글 작성 → POST /api/posts → 성공
→ router.push('/posts')     // 목록 페이지로 이동
→ router.refresh()          // 서버 컴포넌트가 다시 실행되어 새 글이 보임
```

## 5. 전체 페이지 흐름 요약

```
┌─────────────────────────────────────────────────┐
│  서버 컴포넌트 (DB 직접 접근)                      │
│                                                   │
│  / (홈) ← prisma.post.findMany()                 │
│  /posts ← prisma.post.findMany() + 페이지네이션   │
│  /posts/[id] ← prisma.post.findUnique()          │
└──────────────────────┬──────────────────────────┘
                       │ 포함
┌──────────────────────▼──────────────────────────┐
│  클라이언트 컴포넌트 (상호작용)                     │
│                                                   │
│  Navbar ← useState (로그인 상태)                  │
│  PostActions ← onClick (삭제)                     │
│  /login ← onSubmit (POST /api/auth/login)        │
│  /posts/new ← onSubmit (POST /api/posts)         │
│  /posts/[id]/edit ← onSubmit (PUT /api/posts/id) │
└─────────────────────────────────────────────────┘
```

## 정리

이 챕터에서 한 것:
1. ✅ React Hook Form + Zod 폼 패턴
2. ✅ 게시글 작성 페이지 (new)
3. ✅ 게시글 수정 페이지 (edit)
4. ✅ `router.refresh()` 캐시 갱신
5. ✅ 서버/클라이언트 컴포넌트 분리 패턴 정리

---

## 다음 챕터

[07. 배포 →](../07-deployment/README.md)
