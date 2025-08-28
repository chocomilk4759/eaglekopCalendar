import '../styles/globals.css';
import type { Metadata } from 'next';
import AuthButton from './components/AuthButton';
import ThemeToggle from './components/ThemeToggle';
import PresetsDockMount from './components/PresetsDockMount';

export const metadata: Metadata = {
  title: 'Eaglekop Calendar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
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

        {/* ✅ 프리셋 도크(전역 우상단 고정) */}
        <PresetsDockMount />

        {children}
      </body>
    </html>
  );
}
