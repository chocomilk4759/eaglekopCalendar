'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

// ⬇︎ 예약 TLD 기본값(.invalid). Vercel에 NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN 있으면 그걸 사용
const INTERNAL_DOMAIN =
  process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN || 'eaglekop.invalid';

function idToEmail(id: string){ return `${id}@${INTERNAL_DOMAIN}`; }

export default function AuthPage(){
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string|null>(null);

  // login form
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');

  // self password change
  const [newPass1, setNewPass1] = useState('');
  const [newPass2, setNewPass2] = useState('');

  // admin ops
  const [myRoles, setMyRoles] = useState<string[]>([]);
  const [newUserId, setNewUserId] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'editor'|'admin'>('editor');

  const [resetId, setResetId] = useState('');
  const [resetPass, setResetPass] = useState('');

  useEffect(()=>{
    supabase.auth.getUser().then(async ({data})=>{
      const email = data.user?.email ?? null;
      setUserEmail(email);
      if(email){
        const { data: roles } = await supabase.from('user_roles').select('role').eq('email', email);
        setMyRoles((roles||[]).map(r=> r.role as string));
      }
    });
  },[]);

  async function login(){
    const { error } = await supabase.auth.signInWithPassword({ email: idToEmail(id), password });
    if(error){ alert(error.message); return; }
    location.href = '/';
  }
  async function logout(){
    await supabase.auth.signOut();
    location.href = '/auth';
  }
  async function changePassword(){
    if(newPass1 !== newPass2){ alert('비밀번호가 일치하지 않습니다.'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPass1 });
    if(error){ alert(error.message); return; }
    alert('비밀번호가 변경되었습니다. 다시 로그인하세요.');
    await supabase.auth.signOut();
    location.href = '/auth';
  }
  async function createUser(){
    const res = await fetch('/api/admin/create-user', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: newUserId, password: newUserPass, role: newUserRole }) });
    const json = await res.json();
    if(!res.ok){ alert(json.error || '실패'); return; }
    alert('사용자 생성 완료');
  }
  async function resetPassword(){
    const res = await fetch('/api/admin/reset-password', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: resetId, newPassword: resetPass }) });
    const json = await res.json();
    if(!res.ok){ alert(json.error || '실패'); return; }
    alert('초기화 완료');
  }

  return (
    <main className="container">
      <h2>인증</h2>
      {!userEmail && (
        <section style={{display:'grid', gap:8, maxWidth:420}}>
          <h3>로그인 (ID / 비밀번호)</h3>
          <input placeholder="ID (예: superadmin)" value={id} onChange={e=> setId(e.target.value)} />
          <input type="password" placeholder="비밀번호" value={password} onChange={e=> setPassword(e.target.value)} />
          <button onClick={login}>로그인</button>
          <small style={{opacity:.7}}>※ ID는 내부적으로 <code>id@{INTERNAL_DOMAIN}</code> 으로 매핑됩니다.</small>
        </section>
      )}
      {userEmail && (
        <section style={{display:'grid', gap:8, maxWidth:520, marginTop:16}}>
          <div>로그인됨: {userEmail} <button onClick={logout}>로그아웃</button></div>
          <h3>내 비밀번호 변경</h3>
          <input type="password" placeholder="새 비밀번호" value={newPass1} onChange={e=> setNewPass1(e.target.value)} />
          <input type="password" placeholder="새 비밀번호 확인" value={newPass2} onChange={e=> setNewPass2(e.target.value)} />
          <button onClick={changePassword}>변경</button>
          {(myRoles.includes('admin') || myRoles.includes('superadmin')) && (
            <>
              <h3>사용자 생성 (관리자)</h3>
              <input placeholder="새 ID (예: editor1)" value={newUserId} onChange={e=> setNewUserId(e.target.value)} />
              <input type="password" placeholder="초기 비밀번호" value={newUserPass} onChange={e=> setNewUserPass(e.target.value)} />
              <label>역할
                <select value={newUserRole} onChange={e=> setNewUserRole(e.target.value as 'editor'|'admin')}>
                  <option value="editor">editor</option>
                  <option value="admin">admin (superadmin만 가능)</option>
                </select>
              </label>
              <button onClick={createUser}>생성</button>
            </>
          )}
          {myRoles.includes('superadmin') && (
            <>
              <h3>비밀번호 초기화 (최고관리자)</h3>
              <input placeholder="대상 ID" value={resetId} onChange={e=> setResetId(e.target.value)} />
              <input type="password" placeholder="새 비밀번호" value={resetPass} onChange={e=> setResetPass(e.target.value)} />
              <button onClick={resetPassword}>초기화</button>
            </>
          )}
        </section>
      )}
    </main>
  );
}
