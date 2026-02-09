# 08. 트러블슈팅

개발하면서 만난 에러와 해결 방법을 정리한다.

---

## 1. TypeORM 엔티티 속성 초기화 에러

### 에러
```
속성 'createdAt'은(는) 이니셜라이저가 없고 생성자에 할당되어 있지 않습니다. ts(2564)
```

### 원인
`tsconfig.json`의 `"strict": true`가 `strictPropertyInitialization`을 자동으로 켜서, 모든 클래스 속성에 초기값을 요구한다. TypeORM 엔티티는 데코레이터가 런타임에 값을 주입하므로 초기값이 없다.

### 해결
`tsconfig.json`에 옵션 추가:
```json
{
  "compilerOptions": {
    "strict": true,
    "strictPropertyInitialization": false
  }
}
```

---

## 2. TypeORM 컬럼 타입 추론 실패

### 에러
```
ColumnTypeUndefinedError: Column type for Category#name is not defined and cannot be guessed.
Make sure you have turned on an "emitDecoratorMetadata": true option in tsconfig.json.
```

### 원인
`tsx`(esbuild 기반)는 `emitDecoratorMetadata`를 지원하지 않는다. TypeORM이 TypeScript 타입 정보를 자동으로 읽지 못해서 컬럼 타입을 추론할 수 없다.

### 해결
`@Column()`에 `type`을 명시한다:
```typescript
// ❌ 타입 추론 실패
@Column()
name: string

// ✅ 타입 명시
@Column({ type: 'varchar' })
name: string

@Column({ type: 'boolean', default: false })
published: boolean

@Column({ type: 'uuid', name: 'author_id' })
authorId: string
```

---

## 3. 엔티티 순환 참조 에러

### 에러
```
ReferenceError: Cannot access 'User' before initialization
```

### 원인
엔티티들이 서로 import하면서 순환 참조 발생:
```
User → Post → Comment → User (무한 루프)
```

### 해결
3가지를 함께 적용한다:

**1) `import` → `import type`** (컴파일 시 제거되어 순환 참조 끊김)
```typescript
// ❌
import { Post } from './post.entity'

// ✅
import type { Post } from './post.entity'
```

**2) 데코레이터에서 화살표 함수 → 문자열** (지연 참조)
```typescript
// ❌
@OneToMany(() => Post, (post) => post.author)

// ✅
@OneToMany('Post', 'author')
```

**3) 속성 타입에 `Relation<>` 래퍼**
```typescript
import { type Relation } from 'typeorm'

// ❌
posts: Post[]

// ✅
posts: Relation<Post[]>
```

---

## 4. DB 연결 비밀번호 에러

### 에러
```
Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

### 원인
`.env` 파일이 없어서 `process.env.DATABASE_URL`이 `undefined`다.

### 해결
`next-blog/.env` 파일 생성:
```env
DATABASE_URL="postgresql://blog:blog1234@localhost:5432/blog"
JWT_SECRET="dev-secret-change-in-production"
```

---

## 5. Zod v4에서 `.errors` 없음

### 에러
```
Property 'errors' does not exist on type 'ZodError<...>'
```

### 원인
Zod v4에서 `errors` 속성이 `issues`로 변경되었다.

### 해결
```typescript
// ❌ Zod v3
result.error.errors[0].message

// ✅ Zod v4
result.error.issues[0].message
```

---

## 6. useForm + Zod `default()` 타입 충돌

### 에러
```
Type 'Resolver<...>' is not assignable to type 'Resolver<...>'
Type 'boolean | undefined' is not assignable to type 'boolean'.
```

### 원인
`z.boolean().default(false)`를 쓰면 Zod의 input 타입이 `boolean | undefined`가 되는데, useForm은 `boolean`을 기대한다.

### 해결
```typescript
// ❌ default()가 input 타입을 boolean | undefined로 만듦
published: z.boolean().default(false)

// ✅ default 제거, useForm의 defaultValues에서 초기값 설정
published: z.boolean()
```

타입 export도 `z.infer` 대신 `z.input` 사용:
```typescript
// ❌ z.infer = 변환 후 타입 (output)
export type CreatePostInput = z.infer<typeof createPostSchema>

// ✅ z.input = 폼에서 입력하는 타입 (input)
export type CreatePostInput = z.input<typeof createPostSchema>
```

---

## 7. Next.js 16 middleware → proxy 변경

### 에러
```
Proxy is missing expected function export name
```

### 원인
Next.js 16에서 `middleware.ts`가 `proxy.ts`로 이름이 바뀌었고, export 함수명도 변경되었다.

### 해결
```typescript
// ❌ Next.js 15 (middleware.ts)
export function middleware(request: NextRequest) { ... }

// ✅ Next.js 16 (proxy.ts)
export default function proxy(request: NextRequest) { ... }
```

---

## 8. 빌드 시 DB 연결 에러 (prerender)

### 에러
```
Error: Entity metadata for e#posts was not found.
```

### 원인
Next.js 빌드 시 서버 컴포넌트를 prerender(정적 생성)하려고 하는데, 빌드 환경에는 DB가 없어서 실패한다.

### 해결
DB를 조회하는 서버 컴포넌트에 `force-dynamic`을 추가하면 빌드 시 prerender를 건너뛰고, 실제 요청 시에만 실행한다:
```typescript
// DB를 사용하는 서버 컴포넌트 파일 최상단에 추가
export const dynamic = 'force-dynamic'
```

적용 대상:
- `app/page.tsx` (홈)
- `app/posts/page.tsx` (목록)
- `app/posts/[id]/page.tsx` (상세)
