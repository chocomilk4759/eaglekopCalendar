'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import PresetsDock from './PresetsDock';

export default function PresetsDockMount(){
  const supabase = createClient();
  const [canEdit,setCanEdit]=useState(false);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=> setCanEdit(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e,s)=> setCanEdit(!!s?.user));
    return ()=> sub.subscription?.unsubscribe();
  },[supabase.auth]);

  return <PresetsDock canEdit={canEdit} />;
}
