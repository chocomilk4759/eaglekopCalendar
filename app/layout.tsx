import '../styles/globals.css';

export const metadata = { title: '연간 계획표', description: '공유 달력' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="appbar">
          <h1>연간 계획표</h1>
          <nav style={{display:'flex', gap:8}}>
            <a href="/auth">로그인</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
