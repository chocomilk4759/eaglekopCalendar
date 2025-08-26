import '../styles/globals.css'; // 경로가 다르면 './globals.css' 또는 './styles/globals.css'로 조정
import type { Metadata } from 'next';
import AuthButton from './components/AuthButton';
import ThemeToggle from './components/ThemeToggle';

export const metadata: Metadata = {
  title: 'Eaglekop Calendar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 초기 로드 시 깜빡임 없이 테마 적용 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `(function(){try{var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {/* 고정 헤더: 좌측 인증 / 우측 테마 */}
        <div className="header-fixed">
          <div className="left"><AuthButton /></div>
          <div className="right"><ThemeToggle /></div>
        </div>
        {children}
      </body>
    </html>
  );
}
