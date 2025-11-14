'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import Calendar from './components/Calendar';

export default function Page(){
  const supabase = createClient();
  const [canEdit,setCanEdit]=useState(false);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=> setCanEdit(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e,s)=> setCanEdit(!!s?.user));
    return ()=> sub.subscription?.unsubscribe();
  },[supabase.auth]);

  return (
    <main className="container">
      <div className="layout-1-8-1">
        <div className="layout-blank" aria-hidden />
        <div className="col-main">
          <Calendar canEdit={canEdit} />
        </div>
        <div className="layout-blank" aria-hidden />
      </div>
    </main>
  );
}
