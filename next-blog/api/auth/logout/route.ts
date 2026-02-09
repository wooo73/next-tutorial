import { removeAuthCookie } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST() {
  await removeAuthCookie();
  return NextResponse.json({ message: '로그아웃 되었습니다' }, { status: 200 });
}
