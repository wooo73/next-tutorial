import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/database';
import { Post } from '@/entities/post.entity';
import { requireAuth } from '@/lib/api-utils';
import { createPostSchema } from '@/lib/validation';
import { IsNull } from 'typeorm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const categoryId = searchParams.get('categoryId');

  const ds = await getDataSource();
  const postRepo = ds.getRepository(Post);

  const where: Record<string, unknown> = {
    published: true,
    deletedAt: IsNull(),
    ...(categoryId && { categoryId }),
  };

  const [posts, total] = await postRepo.findAndCount({
    where,
    relations: { author: true, category: true },
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json({
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const result = createPostSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const ds = await getDataSource();
    const postRepo = ds.getRepository(Post);
    const post = postRepo.create({
      ...result.data,
      authorId: user.userId,
    });
    await postRepo.save(post);

    const saved = await postRepo.findOne({
      where: { id: post.id },
      relations: { author: true, category: true },
    });

    return NextResponse.json({ post: saved }, { status: 201 });
  } catch (err) {
    console.error('게시글 작성 에러', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
