# 00. 프로젝트 개요와 아키텍처

## 이 챕터에서 배우는 것
- Next.js 15 App Router가 뭔지
- 서버 컴포넌트 vs 클라이언트 컴포넌트
- 우리가 만들 블로그의 전체 구조

---

## 1. Next.js란?

React로 웹사이트를 만들 때, 보통 이런 고민을 한다:
- SEO는 어떻게 하지? (React는 클라이언트에서 렌더링하니까 검색엔진이 못 읽음)
- API 서버를 따로 만들어야 하나?
- 라우팅(페이지 이동)은 어떻게 하지?

**Next.js가 이걸 다 해결해준다.**

```
React만 쓸 때:
  프론트엔드(React) → API 서버(Express 등) → DB

Next.js 쓸 때:
  Next.js (프론트 + API가 한 프로젝트에) → DB
```

## 2. App Router (Next.js 13+)

Next.js에는 두 가지 라우터가 있다:
- **Pages Router** (구버전): `pages/` 폴더 사용
- **App Router** (신버전, 우리가 쓸 것): `app/` 폴더 사용

### 폴더 = URL

```
app/
├── page.tsx          → /              (홈페이지)
├── login/
│   └── page.tsx      → /login         (로그인 페이지)
├── posts/
│   ├── page.tsx      → /posts         (게시글 목록)
│   └── [id]/
│       └── page.tsx  → /posts/123     (게시글 상세)
└── api/
    └── posts/
        └── route.ts  → API: /api/posts
```

**핵심**: `page.tsx`가 있는 폴더가 곧 URL이 된다.

## 3. 서버 컴포넌트 vs 클라이언트 컴포넌트

Next.js 13부터 가장 중요한 개념이다.

### 서버 컴포넌트 (기본값)
```tsx
// app/posts/page.tsx
// "use client" 안 쓰면 서버 컴포넌트

export default async function PostsPage() {
  // 서버에서 직접 DB 조회 가능!
  const posts = await db.post.findMany()

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  )
}
```

**장점**: DB에 직접 접근 가능, API 호출 불필요, SEO 좋음

### 클라이언트 컴포넌트
```tsx
// components/like-button.tsx
"use client"  // 이 한 줄이 핵심!

import { useState } from 'react'

export function LikeButton() {
  const [liked, setLiked] = useState(false)  // useState 사용 가능

  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? '❤️' : '🤍'}
    </button>
  )
}
```

**장점**: 상태관리(useState), 이벤트 핸들러(onClick) 사용 가능

### 언제 뭘 쓰나?

| 기능 | 서버 컴포넌트 | 클라이언트 컴포넌트 |
|------|:-----------:|:--------------:|
| DB 직접 조회 | ✅ | ❌ |
| useState, useEffect | ❌ | ✅ |
| onClick 등 이벤트 | ❌ | ✅ |
| 폼 입력 | ❌ | ✅ |
| API 키 같은 비밀값 사용 | ✅ | ❌ |

**원칙**: 기본은 서버 컴포넌트, 상호작용이 필요한 부분만 클라이언트 컴포넌트

## 4. 우리가 만들 블로그 구조

### 폴더 구조 (ERP 프로젝트와 비교)

```
next-blog/
├── app/                          # 페이지 + API
│   ├── layout.tsx                # 공통 레이아웃 (ERP: app/layout.tsx)
│   ├── page.tsx                  # 홈페이지
│   ├── login/page.tsx            # 로그인
│   ├── register/page.tsx         # 회원가입
│   ├── posts/                    # 게시글 (ERP: app/companies/[id]/menus/)
│   │   ├── page.tsx              # 목록
│   │   ├── new/page.tsx          # 작성
│   │   └── [id]/
│   │       ├── page.tsx          # 상세
│   │       └── edit/page.tsx     # 수정
│   └── api/                      # API 라우트 (ERP: app/api/)
│       ├── auth/
│       │   ├── register/route.ts # POST 회원가입
│       │   └── login/route.ts    # POST 로그인
│       ├── posts/
│       │   └── route.ts          # GET 목록, POST 작성
│       └── posts/[id]/
│           └── route.ts          # GET 상세, PUT 수정, DELETE 삭제
├── components/                   # 재사용 컴포넌트 (ERP: components/)
│   └── ui/                       # shadcn/ui 컴포넌트
├── lib/                          # 유틸리티 (ERP: lib/)
│   ├── prisma.ts                 # DB 클라이언트
│   ├── auth.ts                   # JWT 헬퍼
│   └── validations.ts            # Zod 스키마
├── prisma/
│   ├── schema.prisma             # DB 스키마
│   └── seed.ts                   # 시드 데이터
├── middleware.ts                  # 인증 미들웨어 (ERP: middleware.ts)
└── docker-compose.yml             # PostgreSQL
```

### ERP 프로젝트와의 대응 관계

| ERP 프로젝트 | 블로그 튜토리얼 | 설명 |
|-------------|---------------|------|
| `lib/supabase.ts` | `lib/prisma.ts` | DB 클라이언트 |
| `app/api/companies/route.ts` | `app/api/posts/route.ts` | RESTful API |
| `app/companies/[id]/page.tsx` | `app/posts/[id]/page.tsx` | 동적 라우트 |
| Clerk 미들웨어 | JWT 미들웨어 | 인증 처리 |
| `types/supabase.ts` | `prisma/schema.prisma` | 타입/스키마 정의 |

## 5. 데이터 흐름 이해

### 게시글 목록을 보여주는 흐름

```
1. 유저가 /posts 접속
2. app/posts/page.tsx (서버 컴포넌트) 실행
3. Prisma로 DB에서 게시글 목록 조회
4. HTML로 렌더링해서 브라우저에 전달
5. 브라우저에 게시글 목록이 보인다
```

### 게시글을 작성하는 흐름

```
1. 유저가 /posts/new 접속 (폼이 보임)
2. 제목, 내용 입력 후 "작성" 버튼 클릭
3. 클라이언트 컴포넌트에서 fetch('/api/posts', { method: 'POST', body: ... })
4. app/api/posts/route.ts의 POST 함수 실행
5. Zod로 입력값 검증
6. Prisma로 DB에 저장
7. 성공 응답 → 목록 페이지로 이동
```

## 6. Next.js 15 주의사항

ERP 프로젝트와 동일하게, Next.js 15에서는 `params`가 **Promise**다.

```tsx
// ❌ Next.js 14 (구버전)
export default function PostPage({ params }: { params: { id: string } }) {
  const { id } = params
}

// ✅ Next.js 15 (우리가 쓸 것)
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // await 필수!
}
```

이건 실제 코드 작성할 때 다시 자세히 다룬다.

---

## 다음 챕터

[01. 프로젝트 세팅 →](../01-setup/README.md)
