export const dynamic = 'force-dynamic';

import { getDataSource } from '@/lib/database';
import { Post } from '@/entities/post.entity';
import { IsNull } from 'typeorm';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PageProps {
  searchParams: Promise<{ page?: string; categoryId?: string }>;
}

export default async function PostsPage({ searchParams }: PageProps) {
  const { page: pageStr, categoryId } = await searchParams;

  const page = parseInt(pageStr || '1');
  const limit = 10;

  const ds = await getDataSource();
  const postRepo = ds.getRepository(Post);
  const { Category } = await import('@/entities/category.entity');
  const categoryRepo = ds.getRepository(Category);

  const where: Record<string, unknown> = {
    published: true,
    deletedAt: IsNull(),
    ...(categoryId && { categoryId }),
  };

  const [[posts, total], categories] = await Promise.all([
    postRepo.findAndCount({
      where,
      relations: { author: true, category: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    categoryRepo.find({ order: { name: 'ASC' } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">게시글</h1>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-6">
        <Link href="/posts">
          <Badge variant={!categoryId ? 'default' : 'outline'}>전체</Badge>
        </Link>
        {categories.map((cat) => (
          <Link href={`/posts?categoryId=${cat.id}`} key={cat.id}>
            <Badge variant={categoryId === cat.id ? 'default' : 'outline'}>{cat.name}</Badge>
          </Link>
        ))}
      </div>

      {/* 게시글 목록 */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Link href={`/posts/${post.id}`} key={post.id}>
            <Card className="hover:bg-gray-50 transition-colors">
              <CardHeader>
                <CardTitle>{post.title}</CardTitle>
                <CardDescription>
                  {post.author.name} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 line-clamp-2">{post.content.substring(0, 150)}...</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/posts?page=${p}${categoryId ? `&categoryId=${categoryId}` : ''}`}>
              <Badge variant={p === page ? 'default' : 'outline'}>{p}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
