'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabaseClient';

export default function AuthPage(){
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [userEmail, setUserEmail] = useState<string|null>(null);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=> setUserEmail(data.user?.email ?? null));
  },[]);

  async function signIn(){
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL || '' } });
    alert('메일을 확인해 로그인 링크를 클릭하세요.');
  }
  async function signOut(){
    await supabase.auth.signOut();
    location.href = '/';
  }

  return (
    <main className="container">
      <h2>로그인</h2>
      {userEmail ? (
        <div>
          <p>로그인됨: {userEmail}</p>
          <button onClick={signOut}>로그아웃</button>
        </div>
      ) : (
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <input placeholder="이메일" value={email} onChange={e=> setEmail(e.target.value)} />
          <button onClick={signIn}>메일로 로그인</button>
        </div>
      )}
      <p style={{marginTop:12, opacity:.8}}>에디터 권한은 관리자가 별도로 부여해야 합니다.</p>
    </main>
  );
}