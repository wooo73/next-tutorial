import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';

const metadata: Metadata = {
  title: 'My Blog',
  description: 'This is a blog created by Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
