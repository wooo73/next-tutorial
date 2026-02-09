import { getAuthUser } from '@/lib/auth';
import { getDataSource } from '@/lib/database';
import { User } from '@/entities/user.entity';
import { NextResponse } from 'next/server';

export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const ds = await getDataSource();
  const userRepo = ds.getRepository(User);
  const user = await userRepo.findOne({
    where: { id: authUser.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return NextResponse.json({ user });
}
