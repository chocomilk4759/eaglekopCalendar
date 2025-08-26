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

  return (
    <button
      onClick={() => setTheme(t => t==='light' ? 'dark' : 'light')}
      aria-label={`현재 테마: ${theme}`}
    >
      {theme==='light' ? '☀️' : '🌙'}
    </button>
  );
}
