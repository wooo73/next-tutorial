// app/posts/[id]/page.tsx
export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getDataSource } from '@/lib/database';
import { Post } from '@/entities/post.entity';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PostActions } from './post-actions'; // 클라이언트 컴포넌트
import { getAuthUser } from '@/lib/auth';
import { IsNull } from 'typeorm';

interface PageProps {
  params: Promise<{ id: string }>; // Next.js 15: Promise!
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = await params; // await!

  const ds = await getDataSource();
  const postRepo = ds.getRepository(Post);
  const post = await postRepo.findOne({
    where: { id, deletedAt: IsNull() },
    relations: {
      author: true,
      category: true,
      comments: { author: true },
    },
    order: { comments: { createdAt: 'DESC' } },
  });

  if (!post) {
    notFound(); // 404 페이지 보여줌
  }

  const currentUser = await getAuthUser();
  const isAuthor = currentUser?.userId === post.authorId;

  return (
    <article>
      {/* 헤더 */}
      <div className="mb-8">
        {post.category && <Badge className="mb-2">{post.category.name}</Badge>}
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <p className="mt-2 text-gray-500">
          {post.author.name} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
        </p>

        {/* 수정/삭제 버튼 (작성자만) */}
        {isAuthor && <PostActions postId={post.id} />}
      </div>

      <Separator className="my-6" />

      {/* 본문 */}
      <div className="prose max-w-none">{post.content}</div>

      <Separator className="my-6" />

      {/* 댓글 영역 */}
      <section>
        <h2 className="text-xl font-bold mb-4">댓글 ({post.comments.length})</h2>
        {post.comments.map((comment) => (
          <div key={comment.id} className="border rounded-lg p-4 mb-3">
            <p className="text-sm text-gray-500 mb-1">
              {comment.author.name} · {new Date(comment.createdAt).toLocaleDateString('ko-KR')}
            </p>
            <p>{comment.content}</p>
          </div>
        ))}
      </section>
    </article>
  );
}
