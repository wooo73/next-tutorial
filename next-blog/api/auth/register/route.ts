import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/database';
import { User } from '@/entities/user.entity';
import { hashPassword, createToken, setAuthCookie } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { email, password, name } = result.data;

    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);
    const existing = await userRepo.findOneBy({ email });
    if (existing) {
      return NextResponse.json({ error: '이미 가입된 이메일입니다' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const user = userRepo.create({ email, password: hashedPassword, name });
    await userRepo.save(user);

    const token = createToken({ userId: user.id, email: user.email });
    await setAuthCookie(token);

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('회원가입 에러:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
