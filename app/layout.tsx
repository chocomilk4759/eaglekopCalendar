import '../styles/globals.css';
import type { Metadata } from 'next';
import AuthCorner from './components/AuthCorner';

export const metadata: Metadata = {
  title: 'Eaglekop Calendar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthCorner />
        {children}
      </body>
    </html>
  );
}
