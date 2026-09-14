import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '同好会 · 约球与活动',
  description:
    '发布爱好与空闲，认识同好；多选共同时间，人工协助订场，跟进活動与押金退款。',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
