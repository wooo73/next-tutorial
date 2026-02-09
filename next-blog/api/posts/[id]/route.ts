import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/database';
import { Post } from '@/entities/post.entity';
import { IsNull } from 'typeorm';
import { requireAuth } from '@/lib/api-utils';
import { updatePostSchema } from '@/lib/validation';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const ds = await getDataSource();
  const postRepo = ds.getRepository(Post);
  const post = await postRepo.findOne({
    where: { id, deletedAt: IsNull() },
    relations: { author: true, category: true, comments: { author: true } },
    order: { comments: { createdAt: 'DESC' } },
  });

  if (!post) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ post });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { user, error } = await requireAuth();
  if (error) return error;

  // 게시글 존재 + 작성자 확인
  const ds = await getDataSource();
  const postRepo = ds.getRepository(Post);
  const existing = await postRepo.findOneBy({ id });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다' }, { status: 404 });
  }
  if (existing.authorId !== user.userId) {
    return NextResponse.json({ error: '수정 권한이 없습니다' }, { status: 403 });
  }

  const body = await request.json();
  const result = updatePostSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  await postRepo.update({ id }, result.data);

  const post = await postRepo.findOne({
    where: { id },
    relations: { author: true, category: true },
  });

  return NextResponse.json({ post });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { user, error } = await requireAuth();
  if (error) return error;

  const ds = await getDataSource();
  const postRepo = ds.getRepository(Post);
  const existing = await postRepo.findOneBy({ id });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: '게시글을 찾을 수 없습니다' }, { status: 404 });
  }
  if (existing.authorId !== user.userId) {
    return NextResponse.json({ error: '삭제 권한이 없습니다' }, { status: 403 });
  }

  // soft delete: 실제로 지우지 않고 deletedAt만 설정
  await postRepo.update({ id }, { deletedAt: new Date() });

  return NextResponse.json({ message: '삭제되었습니다' });
}
