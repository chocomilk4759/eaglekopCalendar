import '../styles/globals.css';
import type { Metadata } from 'next';
import AuthButton from './components/AuthButton';
import ThemeToggle from './components/ThemeToggle';
import PresetsDockMount from './components/PresetsDockMount';

export const metadata: Metadata = {
  title: 'Eaglekop Calendar',
  description: '이글콥 캘린더 - 코푸땅과 벤치단의 일대기',
  icons: {
    icon: [
      { url: '/favicon.ico?v=2' },                    // 루트 파비콘 (레거시 호환)
      { url: '/icon.png?v=2', type: 'image/png' },   // Next app/icon.png
    ],
    apple: { url: '/apple-icon.png?v=2', sizes: '180x180' },
    other: [{ rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#0ea5e9' }],
  },
  manifest: '/manifest.webmanifest',
  themeColor: '#ffffff',
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
        <div className="header-fixed-top">
          <div className="left"><AuthButton /></div>
          <div className="right"><ThemeToggle /></div>
        </div>

        {/* ✅ 프리셋 도크(전역 우상단 고정) */}
        <div className="header-fixed-bottom">
          <PresetsDockMount />
        </div>
        {children}
      </body>
    </html>
  );
}
