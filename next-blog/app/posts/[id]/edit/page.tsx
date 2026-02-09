'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updatePostSchema, type UpdatePostInput } from '@/lib/validation';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function EditPostPage() {
  // useRouter: 페이지 이동을 코드로 제어하는 훅
  const router = useRouter();

  // useParams: URL의 동적 파라미터를 가져오는 훅
  // /posts/abc/edit 에서 params.id = "abc"
  const params = useParams();
  const postId = params.id as string;

  // useState: 로딩 상태 관리. true면 "로딩 중..." 표시, false면 폼 표시
  const [loading, setLoading] = useState(true);

  // useForm: 폼 관리 훅 (new 페이지와 동일)
  // 수정 페이지는 defaultValues 없이 시작 → useEffect에서 reset()으로 기존 데이터를 채움
  const form = useForm<UpdatePostInput>({
    resolver: zodResolver(updatePostSchema),
  });

  // reset: 폼의 값을 통째로 바꾸는 함수 (기존 게시글 데이터로 채울 때 사용)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  // useEffect: 페이지 열릴 때 기존 게시글 데이터를 API로 가져와서 폼에 채움
  // [postId, reset]: postId가 바뀌면 다시 실행 (다른 글 수정 시)
  useEffect(() => {
    fetch(`/api/posts/${postId}`)
      .then((res) => res.json())
      .then((data) => {
        // reset으로 폼에 기존 데이터 채우기
        reset({
          title: data.post.title,
          content: data.post.content,
          categoryId: data.post.categoryId || undefined,
          published: data.post.published,
        });
        setLoading(false); // 로딩 끝 → 폼 보여줌
      });
  }, [postId, reset]);

  // 폼 제출 시 실행되는 함수 (PUT으로 수정 요청)
  const onSubmit = async (data: UpdatePostInput) => {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      router.push(`/posts/${postId}`);
      router.refresh();
    } else {
      const error = await res.json();
      alert(error.error);
    }
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>게시글 수정</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">제목</Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <Label htmlFor="content">내용</Label>
            <Textarea id="content" rows={15} {...register('content')} />
            {errors.content && <p className="text-sm text-red-500 mt-1">{errors.content.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="published" {...register('published')} />
            <Label htmlFor="published">공개하기</Label>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '수정'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
