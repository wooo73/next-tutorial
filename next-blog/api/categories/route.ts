import { NextResponse } from 'next/server';
import { getDataSource } from '@/lib/database';
import { Category } from '@/entities/category.entity';

export async function GET() {
  const ds = await getDataSource();
  const categoryRepo = ds.getRepository(Category);
  const categories = await categoryRepo.find({
    relations: { posts: true },
    order: { name: 'ASC' },
  });

  // 게시글 수를 포함해서 응답
  const result = categories.map((cat) => ({
    ...cat,
    _count: { posts: cat.posts?.length ?? 0 },
    posts: undefined, // 게시글 전체 데이터는 제외
  }));

  return NextResponse.json({ categories: result });
}
