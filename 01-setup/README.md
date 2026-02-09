# 01. 프로젝트 세팅

## 이 챕터에서 배우는 것
- Next.js 15 프로젝트 생성
- Tailwind CSS 설정
- shadcn/ui 컴포넌트 라이브러리 추가
- 프로젝트 폴더 구조 만들기

---

## 1. Next.js 프로젝트 생성

```bash
npx create-next-app@latest next-blog
```

설치 중 물어보는 옵션:

```
✔ Would you like to use TypeScript?              → Yes
✔ Would you like to use ESLint?                   → Yes
✔ Would you like to use Tailwind CSS?             → Yes
✔ Would you like your code inside a `src/` dir?   → No
✔ Would you like to use App Router?               → Yes
✔ Would you like to use Turbopack for next dev?   → Yes
✔ Would you like to customize the import alias?   → Yes → @/*
```

```bash
cd next-blog
```

### 생성된 폴더 구조 확인

```
next-blog/
├── app/
│   ├── layout.tsx      # 모든 페이지의 공통 레이아웃
│   ├── page.tsx         # 홈페이지 (/)
│   └── globals.css      # 전역 스타일
├── public/              # 정적 파일 (이미지 등)
├── next.config.ts       # Next.js 설정
├── tailwind.config.ts   # Tailwind 설정
├── tsconfig.json        # TypeScript 설정
└── package.json
```

## 2. 개발 서버 실행해보기

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → Next.js 기본 페이지가 보인다.

## 3. 기본 페이지 정리

### `app/layout.tsx` - 공통 레이아웃

이 파일은 **모든 페이지를 감싸는 껍데기**다. HTML의 `<html>`, `<body>` 태그가 여기 있다.

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
```

> **ERP 비교**: ERP의 `app/layout.tsx`에도 ClerkProvider, Toaster 등 전역 설정이 여기 들어간다.

### `app/page.tsx` - 홈페이지

```tsx
// app/page.tsx
export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold">내 블로그</h1>
      <p className="mt-4 text-gray-600">Next.js 15로 만드는 블로그</p>
    </main>
  )
}
```

브라우저에서 확인하면 깔끔한 홈페이지가 보인다.

## 4. shadcn/ui 설치

shadcn/ui는 복사-붙여넣기 방식의 컴포넌트 라이브러리다.
Bootstrap처럼 npm으로 통째로 설치하는 게 아니라, **필요한 컴포넌트만 프로젝트에 복사**한다.

```bash
npx shadcn@latest init
```

옵션:
```
✔ Which style would you like to use?    → New York
✔ Which color would you like to use?    → Neutral
✔ Would you like to use CSS variables?  → Yes
```

### 자주 쓸 컴포넌트 설치

```bash
npx shadcn@latest add button card input label textarea badge separator
```

설치 후 `components/ui/` 폴더에 파일들이 생긴다:

```
components/
└── ui/
    ├── button.tsx
    ├── card.tsx
    ├── input.tsx
    ├── label.tsx
    ├── textarea.tsx
    ├── badge.tsx
    └── separator.tsx
```

### 사용 예시

```tsx
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold">내 블로그</h1>
      <Button>글 쓰기</Button>
    </main>
  )
}
```

> **ERP 비교**: ERP 프로젝트의 `components/ui/` 폴더도 똑같이 shadcn/ui 컴포넌트들이다.

## 5. 추가 패키지 설치

나중에 사용할 패키지들을 미리 설치한다.

```bash
# 폼 관련
npm install react-hook-form zod @hookform/resolvers

# 인증 관련
npm install bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken

# DB 관련 (다음 챕터에서 자세히)
npm install prisma @prisma/client
```

| 패키지 | 용도 | ERP에서는? |
|--------|------|-----------|
| `react-hook-form` | 폼 상태 관리 | 동일 사용 |
| `zod` | 입력값 검증 | 동일 사용 |
| `bcryptjs` | 비밀번호 암호화 | Clerk가 대신 처리 |
| `jsonwebtoken` | JWT 토큰 생성/검증 | Clerk가 대신 처리 |
| `prisma` | DB ORM | Supabase 클라이언트 사용 |

## 6. 폴더 구조 만들기

```bash
mkdir -p lib
mkdir -p types
```

```
next-blog/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── ui/            # shadcn/ui (자동 생성됨)
├── lib/               # 유틸리티 (DB, Auth 헬퍼)
├── types/              # 타입 정의
├── prisma/             # DB 스키마 (다음 챕터)
└── public/
```

## 7. `@/` import alias 확인

`tsconfig.json`에 이미 설정되어 있다:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

이렇게 하면:
```tsx
// ❌ 상대경로 (깊어지면 복잡해짐)
import { Button } from '../../../components/ui/button'

// ✅ alias (항상 깔끔)
import { Button } from '@/components/ui/button'
```

> **ERP 비교**: ERP 프로젝트도 `@/` alias를 동일하게 사용한다.

## 정리

이 챕터에서 한 것:
1. ✅ Next.js 15 프로젝트 생성 (App Router + TypeScript)
2. ✅ 기본 페이지 정리 (layout.tsx, page.tsx)
3. ✅ shadcn/ui 설치 및 컴포넌트 추가
4. ✅ 필요한 패키지 설치
5. ✅ 폴더 구조 셋업

---

## 다음 챕터

[02. 데이터베이스 →](../02-database/README.md)
