import '../styles/globals.css';
import type { Metadata, Viewport } from 'next';
import ErrorBoundary from './components/ErrorBoundary';
import AuthButton from './components/AuthButton';
import ThemeToggle from './components/ThemeToggle';
import PresetsDockMount from './components/PresetsDockMount';

export const metadata: Metadata = {
  title: 'Eaglekop Calendar',
  description: '이글콥 캘린더 - 코푸땅과 벤치단의 일대기',
  openGraph: {
    title: 'Eaglekop Calendar',
    description: '이글콥 캘린더 - 코푸땅과 벤치단의 일대기',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary',
    title: 'Eaglekop Calendar',
    description: '이글콥 캘린더 - 코푸땅과 벤치단의 일대기',
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=2' },                    // 루트 파비콘 (레거시 호환)
      { url: '/icon.png?v=2', type: 'image/png' },   // Next app/icon.png
    ],
    apple: { url: '/apple-icon.png?v=2', sizes: '180x180' },
    other: [{ rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#0ea5e9' }],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/*
          테마 초기화 스크립트 (FOUC 방지)
          - 정적 코드만 포함하며 사용자 입력이 없으므로 XSS 위험 없음
          - SSR 시 즉시 실행되어 테마 깜빡임 방지
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </body>
    </html>
  );
}
