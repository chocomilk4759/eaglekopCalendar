'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function AccountPage() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw1, setNewPw1] = useState('');
  const [newPw2, setNewPw2] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function changePassword() {
    if (!email) { alert('로그인 상태가 아닙니다.'); return; }
    if (!currentPw || !newPw1 || !newPw2) { alert('모든 입력란을 채우세요.'); return; }
    if (newPw1 !== newPw2) { alert('신규 비밀번호가 일치하지 않습니다.'); return; }
    if (newPw1.length < 8) { alert('신규 비밀번호는 8자 이상 권장합니다.'); return; }

    // 1) 기존 비밀번호 검증(재인증)
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPw,
    });
    if (reauthErr) {
      alert('현재 비밀번호가 올바르지 않습니다.');
      return;
    }

    // 2) 비밀번호 변경
    const { error: updErr } = await supabase.auth.updateUser({ password: newPw1 });
    if (updErr) {
      alert(updErr.message || '비밀번호 변경 실패');
      return;
    }

    alert('비밀번호가 변경되었습니다. 다시 로그인하세요.');
    await supabase.auth.signOut();
    location.href = '/auth';
  }

  if (!email) {
    return (
      <main style={{ maxWidth: 520, margin: '40px auto' }}>
        <h2>정보편집</h2>
        <p>로그인 후 이용하세요.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 520, margin: '40px auto', display: 'grid', gap: 10 }}>
      <h2>정보편집 (비밀번호 변경)</h2>
      <div>로그인 이메일: {email}</div>
      <input type="password" placeholder="현재 비밀번호" value={currentPw} onChange={e=>setCurrentPw(e.target.value)} />
      <input type="password" placeholder="신규 비밀번호" value={newPw1} onChange={e=>setNewPw1(e.target.value)} />
      <input type="password" placeholder="신규 비밀번호 재입력" value={newPw2} onChange={e=>setNewPw2(e.target.value)} />
      <button onClick={changePassword}>비밀번호 변경</button>
      <style jsx>{`
        input, button { padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
        button { background: #fff; cursor: pointer; }
        button:hover { background: #f7f7f7; }
      `}</style>
    </main>
  );
}
