// app/posts/[id]/post-actions.tsx
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PostActions({ postId }: { postId: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/posts');
      router.refresh();
    }
  };

  return (
    <div className="flex gap-2 mt-4">
      <Link href={`/posts/${postId}/edit`}>
        <Button variant="outline" size="sm">
          수정
        </Button>
      </Link>
      <Button variant="destructive" size="sm" onClick={handleDelete}>
        삭제
      </Button>
    </div>
  );
}
