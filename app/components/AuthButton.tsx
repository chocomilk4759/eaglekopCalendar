'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const INTERNAL_DOMAIN = process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN || 'eaglekop.invalid';
const idToEmail = (id:string)=>`${id}@${INTERNAL_DOMAIN}`;

export default function AuthButton(){
  const supabase = createClient();
  const [email,setEmail]=useState<string|null>(null);
  const [open,setOpen]=useState(false);

  // login
  const [id,setId]=useState(''); const [pw,setPw]=useState(''); const [loading,setLoading]=useState(false);
  // change pw
  const [cur,setCur]=useState(''); const [n1,setN1]=useState(''); const [n2,setN2]=useState(''); const [chg,setChg]=useState(false);

  useEffect(()=>{
    let mounted=true;
    supabase.auth.getUser().then(({data})=> mounted && setEmail(data.user?.email??null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e,s)=> setEmail(s?.user?.email??null));
    return ()=> sub.subscription?.unsubscribe();
  },[]);

  const userId = email? email.split('@')[0] : null;
  const isAuthed = !!email;

  async function login(){
    if(!id || !pw){ alert('ID/비밀번호 입력'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email:idToEmail(id), password:pw });
    setLoading(false);
    if(error){ alert(error.message); return; }
    setOpen(false);
  }
  async function changePassword(){
    if(!isAuthed){ alert('로그인 필요'); return; }
    if(!cur||!n1||!n2){ alert('모든 입력란 필요'); return; }
    if(n1!==n2){ alert('변경 비밀번호 불일치'); return; }
    const { error: re } = await supabase.auth.signInWithPassword({ email:email!, password:cur });
    if(re){ alert('현재 비밀번호 불일치'); return; }
    const { error: up } = await supabase.auth.updateUser({ password:n1 });
    if(up){ alert(up.message||'변경 실패'); return; }
    alert('비밀번호 변경 완료');
    setCur(''); setN1(''); setN2('');
    setOpen(false);
  }
  async function logout(){
    await supabase.auth.signOut();
    alert('로그아웃됨');
    setOpen(false);
  }

  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)}>{isAuthed? `👤 ${userId}` : '인증'}</button>

      {open && <div className="overlay" onClick={()=>setOpen(false)} />}

      <div className={`pop ${open?'open':''}`} style={{left:0, right:'auto'}}>
        {!isAuthed ? (
          <div style={{display:'grid', gap:8}}>
            <h4>로그인</h4>
            <input placeholder="ID" value={id} onChange={e=>setId(e.target.value)} />
            <input type="password" placeholder="비밀번호" value={pw} onChange={e=>setPw(e.target.value)} />
            <button onClick={login} disabled={loading}>{loading?'로그인 중…':'로그인'}</button>
          </div>
        ) : (
          <div style={{display:'grid', gap:8}}>
            <div style={{fontSize:12, color:'var(--muted)'}}>ID: {userId}</div>
            <h4>비밀번호 변경</h4>
            <input type="password" placeholder="현재 비밀번호" value={cur} onChange={e=>setCur(e.target.value)} />
            <input type="password" placeholder="변경 비밀번호" value={n1} onChange={e=>setN1(e.target.value)} />
            <input type="password" placeholder="변경 비밀번호 재입력" value={n2} onChange={e=>setN2(e.target.value)} />
            <button onClick={changePassword} disabled={chg}>{chg?'변경 중…':'비밀번호 변경'}</button>
            <button onClick={logout}>로그아웃</button>
          </div>
        )}
      </div>
    </div>
  );
}
