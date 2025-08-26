'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle(){
  const [theme,setTheme]=useState<'light'|'dark'>(() => {
    if (typeof window==='undefined') return 'light';
    return (localStorage.getItem('theme') as 'light'|'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  // 현재 상태만 렌더 (호버로 컨텐츠/아이콘 바꾸지 않음)
  const icon = theme === 'light' ? '☀️' : '🌙';
  const label = theme === 'light' ? 'Light' : 'Dark';

  return (
    <button
      onClick={toggle}
      aria-label={`현재 테마: ${label}. 클릭 시 전환`}
      // title 제거: 호버 시 텍스트 뜨는 부작용 차단
    >
      {icon} {label}
    </button>
  );
}
