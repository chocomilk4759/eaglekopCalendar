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
    <main className="container">
      {/* 1 : 8 : 1 */}
      <div className="layout-1-8-1">
        <div aria-hidden />
        <div><Calendar canEdit={canEdit} /></div>
        <aside><PresetsDock canEdit={canEdit} /></aside>
      </div>
    </main>
  );
}
