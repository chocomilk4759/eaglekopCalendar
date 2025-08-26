'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import Calendar from './components/Calendar';
import PresetsDock from './components/PresetsDock';

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
      {/* ✅ 프리셋 도크: ThemeToggle 바로 아래(우상단 고정) */}
      <PresetsDock canEdit={canEdit} />

      {/* 본문: 1 : 8 : 1 레이아웃에서 우측은 스페이서만 둠 */}
      <main className="container">
        <div className="layout-1-8-1">
          <div aria-hidden />
          <div><Calendar canEdit={canEdit} /></div>
          <div aria-hidden />
        </div>
      </main>
    </>
  );
}
