'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import Calendar from './components/Calendar';
import PresetsPanel from './components/PresetsPanel';
import ThemeToggle from './components/ThemeToggle';
import AuthButton from './components/AuthButton';

export default function Page(){
  const supabase = createClient();
  const [canEdit,setCanEdit]=useState(false);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=> setCanEdit(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e,s)=> setCanEdit(!!s?.user));
    return ()=> sub.subscription?.unsubscribe();
  },[]);

  return (
    <>
      {/* 고정 헤더: 좌상단 인증 / 우상단 테마 */}
      <div className="header-fixed">
        <div className="left"><AuthButton /></div>
        <div className="right"><ThemeToggle /></div>
      </div>

      <main className="container">
        <Calendar canEdit={canEdit} />
        <PresetsPanel canEdit={canEdit} />
      </main>
    </>
  );
}
