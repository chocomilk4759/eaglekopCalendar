'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle(){
  const [theme,setTheme]=useState<'light'|'dark'>(() => (typeof window==='undefined'?'light':(localStorage.getItem('theme') as any)||'light'));
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme==='dark'?'dark':'light');
    localStorage.setItem('theme', theme);
  }, [theme]);
  return (
    <button onClick={()=>setTheme(t=>t==='light'?'dark':'light')} title="테마 전환">
      {theme==='light'?'🌙 Dark':'☀️ Light'}
    </button>
  );
}
