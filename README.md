# Next.js 블로그 튜토리얼

LunchLab ERP 프로젝트와 동일한 구조로 블로그를 만들면서 Next.js 15를 배운다.

## 기술 스택

| 기술 | ERP 프로젝트 | 이 튜토리얼 |
|------|-------------|------------|
| 프레임워크 | Next.js 15 (App Router) | Next.js 15 (App Router) |
| 언어 | TypeScript | TypeScript |
| DB | Supabase (PostgreSQL) | Docker PostgreSQL + TypeORM |
| 인증 | Clerk (OAuth) | ID/Password (bcrypt + JWT) |
| UI | shadcn/ui + Tailwind | shadcn/ui + Tailwind |
| 폼 | React Hook Form + Zod | React Hook Form + Zod |

## 완성할 블로그 기능

- 회원가입/로그인 (ID + Password, JWT 세션)
- 게시글 CRUD (작성, 목록, 상세, 수정, 삭제)
- 카테고리 관리
- 댓글 기능
- 마크다운 에디터
- 페이지네이션

## 목차

| 챕터 | 주제 | 핵심 개념 |
|------|------|----------|
| 00 | [프로젝트 개요와 아키텍처](./00-overview/README.md) | Next.js App Router 구조 이해 |
| 01 | [프로젝트 세팅](./01-setup/README.md) | Next.js, TypeScript, Tailwind, shadcn/ui |
| 02 | [데이터베이스](./02-database/README.md) | Docker PostgreSQL, TypeORM 엔티티, 시드 |
| 03 | [인증 (ID/Password)](./03-auth/README.md) | bcrypt, JWT, 미들웨어, 세션 관리 |
| 04 | [API 라우트](./04-api-routes/README.md) | RESTful API, Zod 검증, 에러 처리 |
| 05 | [페이지 구현](./05-pages/README.md) | Server/Client 컴포넌트, 동적 라우트 |
| 06 | [컴포넌트 심화](./06-components/README.md) | 폼, 마크다운, 페이지네이션 |
| 07 | [배포](./07-deployment/README.md) | Vercel 배포, 환경 변수 |

## 시작하기

```bash
# 00장부터 순서대로 따라하기
cat 00-overview/README.md
```
