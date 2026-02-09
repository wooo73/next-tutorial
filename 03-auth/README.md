# 03. 인증 (ID/Password)

## 이 챕터에서 배우는 것
- 비밀번호 암호화 (bcrypt)
- JWT 토큰이 뭔지, 어떻게 쓰는지
- 회원가입/로그인 API 만들기
- 미들웨어로 로그인 여부 확인하기
- 쿠키로 세션 관리하기

---

## 1. 인증이란?

"이 사람이 누구인지 확인하는 것"

```
회원가입: 이메일 + 비밀번호 → DB에 저장
로그인:   이메일 + 비밀번호 → 확인 → JWT 토큰 발급
API 요청: JWT 토큰을 같이 보냄 → 서버가 "아, 이 사람이구나" 확인
```

> **ERP 비교**: ERP는 Clerk가 이걸 다 해준다. 여기서는 직접 만들어보면서 원리를 이해한다.

## 2. 비밀번호 암호화 (bcrypt)

비밀번호를 DB에 저장할 때 **절대 평문으로 저장하면 안 된다**.

```
❌ DB에 저장: "mypassword123"
✅ DB에 저장: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIj..."  (해시값)
```

```typescript
import bcrypt from 'bcryptjs'

// 암호화 (회원가입 시)
const hashed = await bcrypt.hash('mypassword123', 10)
// → "$2a$10$N9qo8uLOickgx2ZMRZoMyeIj..."

// 비교 (로그인 시)
const isMatch = await bcrypt.compare('mypassword123', hashed)
// → true
```

## 3. JWT (JSON Web Token)

### JWT가 뭔가?

로그인 성공 후 서버가 발급하는 **신분증** 같은 것이다.

```
JWT 토큰 = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.abc123..."
```

이 토큰 안에는 정보가 들어있다:
```json
{
  "userId": "123",
  "email": "test@example.com",
  "iat": 1700000000,       // 발급 시간
  "exp": 1700086400         // 만료 시간 (24시간 후)
}
```

### JWT 흐름

```
1. 로그인 성공 → 서버가 JWT 토큰 생성 → 쿠키에 저장
2. 이후 API 요청마다 쿠키의 JWT가 자동으로 같이 전송됨
3. 서버가 JWT를 검증 → "이 사람은 userId=123인 유저구나"
4. 토큰 만료(24시간) → 다시 로그인 필요
```

## 4. Auth 유틸리티 만들기

### `lib/auth.ts`

```typescript
// lib/auth.ts
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const TOKEN_NAME = 'blog-token'

// ─── 비밀번호 ────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// ─── JWT 토큰 ────────────────────────────

interface TokenPayload {
  userId: string
  email: string
}

export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

// ─── 쿠키 세션 ───────────────────────────

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,     // JavaScript에서 접근 불가 (보안)
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24시간
    path: '/',
  })
}

export async function removeAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(TOKEN_NAME)
}

export async function getAuthUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}
```

### .env에 시크릿 추가

```env
# .env
DATABASE_URL="postgresql://blog:blog1234@localhost:5432/blog"
JWT_SECRET="my-super-secret-key-change-this"
```

## 5. Zod 검증 스키마

입력값을 검증하는 스키마를 만든다.

### `lib/validations.ts`

```typescript
// lib/validations.ts
import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  name: z.string().min(1, '이름을 입력하세요'),
})

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
```

> **ERP 비교**: ERP에서도 React Hook Form + Zod 조합으로 폼 검증한다. 같은 패턴이다.

## 6. 회원가입 API

### `app/api/auth/register/route.ts`

```typescript
// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createToken, setAuthCookie } from '@/lib/auth'
import { registerSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    // 1. 요청 바디 파싱
    const body = await request.json()

    // 2. 입력값 검증
    const result = registerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      )
    }

    const { email, password, name } = result.data

    // 3. 이메일 중복 확인
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: '이미 가입된 이메일입니다' },
        { status: 409 },
      )
    }

    // 4. 비밀번호 암호화 + DB 저장
    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    })

    // 5. JWT 토큰 발급 + 쿠키 저장
    const token = createToken({ userId: user.id, email: user.email })
    await setAuthCookie(token)

    // 6. 응답 (비밀번호는 절대 응답에 포함하지 않는다!)
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    }, { status: 201 })

  } catch (error) {
    console.error('회원가입 에러:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
```

## 7. 로그인 API

### `app/api/auth/login/route.ts`

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 1. 입력값 검증
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      )
    }

    const { email, password } = result.data

    // 2. 유저 찾기
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 },
      )
    }

    // 3. 비밀번호 확인
    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 },
      )
    }

    // 4. JWT 토큰 발급 + 쿠키 저장
    const token = createToken({ userId: user.id, email: user.email })
    await setAuthCookie(token)

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    })

  } catch (error) {
    console.error('로그인 에러:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 },
    )
  }
}
```

> **보안 포인트**: "이메일이 없습니다" / "비밀번호가 틀렸습니다"를 구분하지 않는다.
> 구분하면 공격자가 "이 이메일은 가입되어 있구나"를 알 수 있기 때문이다.

## 8. 로그아웃 API

### `app/api/auth/logout/route.ts`

```typescript
// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { removeAuthCookie } from '@/lib/auth'

export async function POST() {
  await removeAuthCookie()
  return NextResponse.json({ message: '로그아웃 되었습니다' })
}
```

## 9. 미들웨어 (로그인 필수 페이지 보호)

### `middleware.ts`

```typescript
// middleware.ts (프로젝트 루트에 위치)
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// 로그인 없이 접근 가능한 경로
const publicPaths = ['/', '/login', '/register', '/api/auth']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 공개 경로는 통과
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 정적 파일은 통과
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // 토큰 확인
  const token = request.cookies.get('blog-token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const user = verifyToken(token)
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

> **ERP 비교**: ERP의 `middleware.ts`도 Clerk의 `clerkMiddleware()`로 같은 역할을 한다.
> 로그인 안 한 유저를 `/sign-in`으로 리다이렉트한다.

## 10. 현재 로그인 유저 가져오기 API

### `app/api/auth/me/route.ts`

```typescript
// app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { id: true, email: true, name: true, createdAt: true },
    // select로 필요한 필드만! password는 절대 포함하지 않는다
  })

  return NextResponse.json({ user })
}
```

## 11. API 테스트 (curl)

```bash
# 회원가입
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"test1234","name":"홍길동"}'

# 로그인
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"test1234"}' \
  -c cookies.txt

# 현재 유저 확인 (쿠키 필요)
curl http://localhost:3000/api/auth/me -b cookies.txt

# 로그아웃
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

## 정리

이 챕터에서 한 것:
1. ✅ bcrypt로 비밀번호 암호화/비교
2. ✅ JWT 토큰 생성/검증
3. ✅ httpOnly 쿠키로 세션 관리
4. ✅ 회원가입 API (`POST /api/auth/register`)
5. ✅ 로그인 API (`POST /api/auth/login`)
6. ✅ 로그아웃 API (`POST /api/auth/logout`)
7. ✅ 미들웨어로 보호 라우트 설정

### ERP와 비교

| 항목 | ERP (Clerk) | 블로그 (직접 구현) |
|------|------------|------------------|
| 비밀번호 관리 | Clerk가 처리 | bcrypt로 직접 해시 |
| 토큰 발급 | Clerk가 JWT 발급 | jsonwebtoken으로 직접 발급 |
| 세션 관리 | Clerk 쿠키 | httpOnly 쿠키에 JWT 저장 |
| 미들웨어 | `clerkMiddleware()` | 직접 JWT 검증 로직 작성 |

---

## 다음 챕터

[04. API 라우트 →](../04-api-routes/README.md)
