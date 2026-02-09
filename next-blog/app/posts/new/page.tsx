'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPostSchema, type CreatePostInput } from '@/lib/validation';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Category {
  id: string;
  name: string;
}

export default function NewPostPage() {
  // useRouter: 페이지 이동을 코드로 제어하는 훅 (router.push('/경로')로 이동)
  const router = useRouter();

  // useState: 컴포넌트 안에서 변하는 값을 저장하는 훅
  // categories가 값, setCategories가 값을 바꾸는 함수
  // 처음에는 빈 배열 []로 시작하고, API 응답이 오면 setCategories로 채움
  const [categories, setCategories] = useState<Category[]>([]);

  // useForm: 폼의 입력값, 검증, 제출을 한번에 관리하는 훅 (react-hook-form)
  // resolver: Zod 스키마로 자동 검증 (제목 비었으면 에러 등)
  // defaultValues: 폼의 초기값
  const form = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: '',
      content: '',
      published: false,
    },
  });

  // register: input에 연결하면 입력값을 자동 추적 ({...register('title')})
  // handleSubmit: 폼 제출 시 검증 통과하면 onSubmit 실행, 실패하면 errors에 에러 메시지 저장
  // errors: 검증 실패한 필드의 에러 메시지 (errors.title.message 등)
  // isSubmitting: 제출 중이면 true (버튼 비활성화용)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  // useEffect: 컴포넌트가 화면에 나타났을 때 한 번 실행되는 훅
  // 두 번째 인자 []가 빈 배열이면 "처음 한 번만 실행"
  // 여기서는 카테고리 목록을 API로 가져옴
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories));
  }, []);

  // 폼 제출 시 실행되는 함수 (handleSubmit이 검증 통과 후 호출)
  const onSubmit = async (data: CreatePostInput) => {
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error);
        return;
      }

      const { post } = await res.json();
      router.push(`/posts/${post.id}`);  // 작성된 글 상세 페이지로 이동
      router.refresh();                   // 서버 컴포넌트 캐시 갱신 (새 글이 목록에 바로 보이도록)
    } catch {
      alert('서버 오류가 발생했습니다');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>새 게시글 작성</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* 제목 */}
          <div>
            <Label htmlFor="title">제목</Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          {/* 카테고리 */}
          <div>
            <Label htmlFor="categoryId">카테고리</Label>
            <select id="categoryId" {...register('categoryId')} className="w-full border rounded-md px-3 py-2">
              <option value="">선택 안 함</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 내용 */}
          <div>
            <Label htmlFor="content">내용 (마크다운)</Label>
            <Textarea id="content" rows={15} {...register('content')} placeholder="마크다운으로 작성하세요..." />
            {errors.content && <p className="text-sm text-red-500 mt-1">{errors.content.message}</p>}
          </div>

          {/* 공개 여부 */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="published" {...register('published')} className="rounded" />
            <Label htmlFor="published">바로 공개하기</Label>
          </div>
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '작성'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
