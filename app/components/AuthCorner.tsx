'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import Link from 'next/link';

const INTERNAL_DOMAIN =
  process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN || 'eaglekop.invalid';
const idToEmail = (id: string) => `${id}@${INTERNAL_DOMAIN}`;

export default function AuthCorner() {
  const supabase = createClient();

  // auth
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // popover
  const [open, setOpen] = useState(false);

  // login form
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // change password form (for authenticated user)
  const [currentPw, setCurrentPw] = useState('');
  const [newPw1, setNewPw1] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserEmail(s?.user?.email ?? null);
      // 상태 바뀌면 폼 초기화
      setId(''); setPw('');
      setCurrentPw(''); setNewPw1(''); setNewPw2('');
    });
    return () => { mounted = false; sub.subscription?.unsubscribe(); };
  }, []);

  // 바깥 클릭 닫기: 투명 오버레이 사용
  function close() { setOpen(false); }
  function toggle() { setOpen(v => !v); }

  async function login() {
    if (!id || !pw) {
      alert('ID와 비밀번호를 입력하세요.');
      return;
    }
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: idToEmail(id),
      password: pw,
    });
    setLoginLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    // 로그인 성공 -> 상태 리스너에서 이메일 반영, 패널은 그대로 둠(원하면 닫기)
    // close();
  }

  async function changePassword() {
    if (!userEmail) { alert('로그인 상태가 아닙니다.'); return; }
    if (!currentPw || !newPw1 || !newPw2) {
      alert('모든 입력란을 채우세요.');
      return;
    }
    if (newPw1 !== newPw2) {
      alert('변경 비밀번호가 일치하지 않습니다.');
      return;
    }
    setChangeLoading(true);
    // 현재 비번 검증(재인증)
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPw,
    });
    if (reauthErr) {
      setChangeLoading(false);
      alert('현재 비밀번호가 올바르지 않습니다.');
      return;
    }
    // 비번 변경
    const { error: updErr } = await supabase.auth.updateUser({ password: newPw1 });
    setChangeLoading(false);
    if (updErr) {
      alert(updErr.message || '비밀번호 변경 실패');
      return;
    }
    alert('비밀번호가 변경되었습니다.');
    // 원하면 자동 로그아웃/닫기 로직 추가 가능
    // close();
  }

  async function logout() {
    await supabase.auth.signOut();
    alert('로그아웃되었습니다.');
    close();
  }

  const isAuthed = !!userEmail;

  return (
    <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 99999 }}>
      {/* 우측 상단 트리거 */}
      <button
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="authcorner-trigger"
        title={isAuthed ? '계정' : '인증'}
      >
        {isAuthed ? <span aria-hidden>👤</span> : '인증'}
      </button>

      {/* 오버레이(투명): 외부 클릭 닫기 */}
      {open && <div className="authcorner-overlay" onClick={close} aria-hidden />}

      {/* 패널 */}
      <div className={`authcorner-panel ${open ? 'open' : ''}`} role="dialog" aria-modal="false">
        {!isAuthed ? (
          <div className="panel-inner">
            <h4>로그인</h4>
            <input
              placeholder="ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
            />
            <button onClick={login} disabled={loginLoading}>
              {loginLoading ? '로그인 중…' : '로그인'}
            </button>
          </div>
        ) : (
          <div className="panel-inner">
            <div className="user-line">{userEmail}</div>

            <h4>비밀번호 변경</h4>
            <input
              type="password"
              placeholder="현재 비밀번호"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
            <input
              type="password"
              placeholder="변경 비밀번호"
              value={newPw1}
              onChange={(e) => setNewPw1(e.target.value)}
              autoComplete="new-password"
            />
            <input
              type="password"
              placeholder="변경 비밀번호 재입력"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              autoComplete="new-password"
            />
            <button onClick={changePassword} disabled={changeLoading}>
              {changeLoading ? '변경 중…' : '비밀번호 변경'}
            </button>

            <button className="row-btn" onClick={logout}>로그아웃</button>
          </div>
        )}
      </div>

      <style jsx>{`
        .authcorner-trigger {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 999px;
          background: #fff;
          font-size: 14px;
          line-height: 1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .authcorner-trigger:hover { background: #f8f8f8; }

        .authcorner-overlay {
          position: fixed;
          inset: 0;
          z-index: 99998;
          background: transparent;
        }

        .authcorner-panel {
          position: absolute;
          top: 44px;
          right: 0;
          width: 320px;
          max-width: calc(100vw - 24px);
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          padding: 12px;
          opacity: 0;
          transform: scale(0.96);
          transform-origin: top right;
          pointer-events: none;
          transition: opacity .12s ease, transform .12s ease;
          z-index: 99999;
        }
        .authcorner-panel.open {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
        }

        .panel-inner { display: grid; gap: 8px; }
        h4 { margin: 2px 0 6px; font-size: 14px; }
        input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
        }
        .panel-inner > button {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
        }
        .panel-inner > button:hover { background: #f7f7f7; }
        .user-line {
          font-size: 12px;
          color: #666;
          margin-bottom: 6px;
          word-break: break-all;
        }
        .row-btn {
          display: block;
          text-align: center;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
        }
        .row-btn:hover { background: #f7f7f7; }
      `}</style>
    </div>
  );
}
