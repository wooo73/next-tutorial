import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold">내 블로그</h1>
      <p className="mt-4 text-gray-600">Next.js 15로 만드는 블로그</p>
      <Button>글 쓰기</Button>
    </main>
  );
}
