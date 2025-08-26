'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

const INTERNAL_DOMAIN =
  process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN || 'eaglekop.invalid';
const idToEmail = (id: string) => `${id}@${INTERNAL_DOMAIN}`;

export default function AuthCorner() {
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // login form state
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);

  // 현재 로그인 상태 로드 + 상태 변화 반영
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserEmail(s?.user?.email ?? null);
      // 로그인/로그아웃 시 패널은 닫힘
      setOpen(false);
      setId('');
      setPw('');
    });
    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  async function login() {
    if (!id || !pw) { alert('ID와 비밀번호를 입력하세요.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: idToEmail(id),
      password: pw,
    });
    setLoading(false);
    if (error) { alert(error.message); return; }
    // 성공 → onAuthStateChange에서 자동 반영
  }

  async function logout() {
    await supabase.auth.signOut();
    alert('로그아웃되었습니다.');
  }

  const isAuthed = !!userEmail;

  return (
    <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 99999 }}>
      {/* 트리거 버튼 (우상단) */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={isAuthed ? '메뉴' : '인증'}
        className="authcorner-trigger"
      >
        {isAuthed ? <span aria-hidden>👤</span> : '인증'}
      </button>

      {/* 오버레이: 열렸을 때만, 바깥 클릭 닫기용 */}
      {open && (
        <div
          className="authcorner-overlay"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* 팝오버 패널 */}
      <div
        ref={panelRef}
        className={`authcorner-panel ${open ? 'open' : ''}`}
        role="dialog"
        aria-modal="false"
      >
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
            <button onClick={login} disabled={loading}>
              {loading ? '로그인 중…' : '로그인'}
            </button>
          </div>
        ) : (
          <div className="panel-inner">
            <div className="user-line">{userEmail}</div>
            <Link href="/account" className="row-btn">정보편집</Link>
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

        /* 화면 전체 오버레이(투명) - 바깥 클릭 닫기 */
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
          width: 280px;
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
        h4 { margin: 4px 0 6px; font-size: 14px; }
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
          margin-bottom: 4px;
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
