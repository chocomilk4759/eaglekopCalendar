'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import Calendar from './components/Calendar';
import PresetsPanel from './components/PresetsPanel';

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
      <div className="main-grid">
        <div className="main-col">
          <Calendar canEdit={canEdit} />
        </div>
        <aside className="side-col">
          <PresetsPanel canEdit={canEdit} />
        </aside>
      </div>
    </main>
  );
}
