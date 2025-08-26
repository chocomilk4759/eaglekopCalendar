import './globals.css';
import type { Metadata } from 'next';
import UserMenu from './components/UserMenu';

export const metadata: Metadata = {
  title: 'Eaglekop Calendar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <UserMenu />
        {children}
      </body>
    </html>
  );
}
