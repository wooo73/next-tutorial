# 07. 배포

## 이 챕터에서 배우는 것
- Vercel에 배포하기
- 환경 변수 설정
- 프로덕션 DB 연결

---

## 1. 배포 전 체크리스트

```bash
# 빌드 테스트 (배포 전에 반드시!)
npm run build
```

빌드 에러가 없으면 배포 준비 완료.

### 흔한 빌드 에러

| 에러 | 원인 | 해결 |
|------|------|------|
| `Type error` | TypeScript 타입 오류 | 타입 수정 |
| `params is not a Promise` | Next.js 15 params 처리 | `await params` 추가 |
| `Module not found` | import 경로 오류 | 경로 확인 |

## 2. Vercel 배포

### 방법 1: GitHub 연동 (추천)

```bash
# 1. GitHub 저장소 생성 + 푸시
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-name/next-blog.git
git push -u origin main
```

2. [vercel.com](https://vercel.com) 접속 → GitHub 로그인
3. "Import Project" → 저장소 선택
4. Environment Variables 설정 (아래 참고)
5. "Deploy" 클릭

### 방법 2: Vercel CLI

```bash
npm i -g vercel
vercel
```

## 3. 환경 변수 설정

Vercel 대시보드 → Settings → Environment Variables에 추가:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://...` | 프로덕션 DB URL |
| `JWT_SECRET` | (랜덤 문자열) | JWT 서명 키 |

### JWT_SECRET 생성

```bash
openssl rand -base64 32
# → "xK9m2pR7qW3tY8vN1bF5hJ6..." 같은 값이 나온다
```

**중요**: 개발용 `.env`의 값과 프로덕션 값은 반드시 다르게 설정한다!

## 4. 프로덕션 DB

로컬 Docker DB는 개발용이다. 배포 시에는 클라우드 DB를 사용해야 한다.

### 무료 옵션

| 서비스 | 무료 용량 | 특징 |
|--------|----------|------|
| [Supabase](https://supabase.com) | 500MB | ERP에서 사용하는 그것 |
| [Neon](https://neon.tech) | 512MB | Serverless PostgreSQL |
| [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) | 256MB | Vercel 내장 |

### Supabase 연결 예시

1. Supabase 프로젝트 생성
2. Settings → Database → Connection string 복사
3. Vercel 환경변수에 `DATABASE_URL`로 설정

```
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
```

4. Prisma 마이그레이션 실행

```bash
DATABASE_URL="위의URL" npx prisma migrate deploy
```

## 5. 배포 후 확인

```
https://your-blog.vercel.app/          → 홈페이지
https://your-blog.vercel.app/posts     → 게시글 목록
https://your-blog.vercel.app/login     → 로그인
https://your-blog.vercel.app/register  → 회원가입
```

## 6. 전체 아키텍처 요약

```
[브라우저]
    │
    ├── 페이지 요청 → Vercel Edge → Next.js 서버 컴포넌트 → DB 직접 조회
    │
    └── API 요청 → Vercel Serverless Function → Next.js API Route → DB 조회
                                                      │
                                                 Prisma ORM
                                                      │
                                              PostgreSQL (Supabase)
```

### ERP와 비교

```
[ERP 아키텍처]

브라우저 → Next.js (Vercel)
              ├── 서버 컴포넌트 → Supabase 직접 조회
              └── API Route     → Supabase 클라이언트 → PostgreSQL
           + Clerk (인증)

[블로그 아키텍처]

브라우저 → Next.js (Vercel)
              ├── 서버 컴포넌트 → Prisma → PostgreSQL
              └── API Route     → Prisma → PostgreSQL
           + JWT (인증)
```

구조가 거의 같다. 차이점은:
- Supabase 클라이언트 vs Prisma (ORM 선택)
- Clerk vs 직접 JWT 구현 (인증 방식)

## 정리

이 튜토리얼에서 배운 것:

| 챕터 | 핵심 개념 |
|------|----------|
| 00 | App Router, 서버/클라이언트 컴포넌트 |
| 01 | 프로젝트 셋업, shadcn/ui |
| 02 | Docker PostgreSQL, Prisma 스키마 |
| 03 | bcrypt, JWT, 쿠키 세션, 미들웨어 |
| 04 | RESTful API, Zod 검증, Next.js 15 params |
| 05 | 서버 컴포넌트 DB 조회, 동적 라우트 |
| 06 | React Hook Form + Zod 폼, router.refresh() |
| 07 | Vercel 배포, 환경 변수 |

이 패턴들을 이해하면 ERP 프로젝트 코드를 읽고 수정할 수 있다.
