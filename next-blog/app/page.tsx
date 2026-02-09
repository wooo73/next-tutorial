// 빌드 시 prerender 하지 않고, 요청마다 서버에서 실행
export const dynamic = 'force-dynamic';

import { getDataSource } from '@/lib/database';
import { Post } from '@/entities/post.entity';
import { IsNull } from 'typeorm';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function HomePage() {
  const ds = await getDataSource();
  const postRepo = ds.getRepository(Post);
  const recentPosts = await postRepo.find({
    where: { published: true, deletedAt: IsNull() },
    relations: { author: true, category: true },
    order: { createdAt: 'DESC' },
    take: 5,
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">최근 게시글</h1>

      <div className="space-y-4">
        {recentPosts.map((post) => (
          <Link href={`/posts/${post.id}`} key={post.id}>
            <Card className="hover:bg-gray-50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  {post.category && <Badge variant="secondary">{post.category.name}</Badge>}

                  <CardTitle className="text-lg">{post.title}</CardTitle>
                </div>

                <CardDescription>
                  {post.author.name} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {recentPosts.length === 0 && <p className="text-gray-500">아직 게시글이 없습니다.</p>}
    </div>
  );
}
