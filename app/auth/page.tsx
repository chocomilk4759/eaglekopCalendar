'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const INTERNAL_DOMAIN =
  process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN || 'eaglekop.invalid';

function idToEmail(id: string) {
  return `${id}@${INTERNAL_DOMAIN}`;
}

export default function AuthPage() {
  const supabase = createClient();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email: idToEmail(id),
      password,
    });
    if (error) {
      alert(error.message);
      return;
    }
    location.href = '/';
  }

  return (
    <main style={{ maxWidth: 420, margin: '40px auto', display: 'grid', gap: 10 }}>
      <h2>로그인 (편집 전용)</h2>
      <input placeholder="ID (예: editor)" value={id} onChange={e=>setId(e.target.value)} />
      <input type="password" placeholder="비밀번호" value={password} onChange={e=>setPassword(e.target.value)} />
      <button onClick={login}>로그인</button>
      <small style={{opacity:.7}}>※ ID는 내부적으로 <code>id@{INTERNAL_DOMAIN}</code> 이메일에 매핑됩니다.</small>
      <style jsx>{`
        input, button { padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
        button { background: #fff; cursor: pointer; }
        button:hover { background: #f7f7f7; }
      `}</style>
    </main>
  );
}
