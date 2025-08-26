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
      {/* 우측 고정 도크: 테마 토글(우상단) 아래에 뜸 */}
      <PresetsDock canEdit={canEdit} />
      {/* 본문: 도크와 겹치지 않게 우측 패딩 추가 */}
      <main className="container has-dock">
        <Calendar canEdit={canEdit} />
      </main>
    </>
  );
}
