import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  name: z.string().min(1, '이름을 입력하세요'),
});

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const createPostSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200, '제목은 200자 이하'),
  content: z.string().min(1, '내용을 입력하세요'),
  categoryId: z.string().uuid().optional(),
  published: z.boolean(),
});

export const updatePostSchema = createPostSchema.partial();
// partial() = 모든 필드가 optional이 된다

// z.input = 폼에서 입력하는 타입 (useForm용)
export type CreatePostInput = z.input<typeof createPostSchema>;
export type UpdatePostInput = z.input<typeof updatePostSchema>;
