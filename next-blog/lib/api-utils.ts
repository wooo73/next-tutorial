import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 }),
    };
  }
  return { user, error: null };
}
