import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
