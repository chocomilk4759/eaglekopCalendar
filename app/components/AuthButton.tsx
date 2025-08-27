'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function AuthButton() {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);

  // 로그인 상태
  const [email, setEmail] = useState<string | null>(null);
  const displayId = useMemo(() => {
    if (!email) return null;
    const at = email.indexOf('@');
    return at > 0 ? email.slice(0, at) : email; // 이메일은 보여주지 않음(로컬 아이디만)
  }, [email]);

  // 로그인 폼
  const [idInput, setIdInput] = useState('');
  const [pwInput, setPwInput] = useState('');
  const loginDomain = process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN || 'eaglekop.invalid';

  // 비번 변경 폼
  const [editMode, setEditMode] = useState(false);
  const [currPw, setCurrPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');

  // ─────────────────────────────────────────────────────────────
  // 1) Supabase 인증 상태 구독
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        console.warn('[auth.getUser] error:', error.message);
        setEmail(null);
        return;
      }
      setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      alive = false;
      sub.subscription?.unsubscribe();
    };
  }, [supabase]);

  // ─────────────────────────────────────────────────────────────
  // 2) 좌측 도크 열림 상태 → <html data-leftdock="…">
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-leftdock', open ? 'open' : 'closed');
    return () => html.setAttribute('data-leftdock', 'closed');
  }, [open]);

  // ─────────────────────────────────────────────────────────────
  // 3) 핸들러들
  // ─────────────────────────────────────────────────────────────
  const handleLogin = useCallback(async () => {
    const id = (idInput || '').trim();
    const pw = pwInput;
    if (!id || !pw) {
      alert('아이디와 비밀번호를 모두 입력하세요.');
      return;
    }
    const emailLike = id.includes('@') ? id : `${id}@${loginDomain}`;

    const { error } = await supabase.auth.signInWithPassword({
      email: emailLike,
      password: pw,
    });

    if (error) {
      alert(`로그인 실패: ${error.message}`);
      return;
    }
    // 성공
    setIdInput('');
    setPwInput('');
    setOpen(false);
    setEditMode(false);
  }, [idInput, pwInput, loginDomain, supabase]);

  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(`로그아웃 실패: ${error.message}`);
      return;
    }
    setOpen(false);
    setEditMode(false);
    setCurrPw('');
    setNewPw('');
    setNewPw2('');
  }, [supabase]);

  const handleChangePassword = useCallback(async () => {
    if (!email) {
      alert('로그인된 사용자만 비밀번호를 변경할 수 있습니다.');
      return;
    }
    if (!currPw || !newPw || !newPw2) {
      alert('모든 입력란을 채워주세요.');
      return;
    }
    if (newPw !== newPw2) {
      alert('새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    // 현재 비밀번호 검증(재인증) → OK면 updateUser
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: currPw,
    });
    if (reauthError) {
      alert('현재 비밀번호가 일치하지 않습니다.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPw,
    });
    if (updateError) {
      alert(`비밀번호 변경 실패: ${updateError.message}`);
      return;
    }

    alert('비밀번호가 변경되었습니다.');
    setEditMode(false);
    setCurrPw('');
    setNewPw('');
    setNewPw2('');
  }, [email, currPw, newPw, newPw2, supabase]);

  // ─────────────────────────────────────────────────────────────
  // 4) 렌더
  // ─────────────────────────────────────────────────────────────
  const isAuthed = !!email;

  return (
    <div style={{ position: 'relative' }}>
      {/* 좌측 상단 인증 버튼: 로그인 시 사람 아이콘, 미로그인 시 '인증' */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="auth-dock"
        title={isAuthed ? '계정' : '인증'}
      >
        {isAuthed ? '👤' : '인증'}
      </button>

      {/* 바깥 클릭 시 닫기 (오버레이) */}
      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      {/* 좌측 도크(폭 320px) — CSS .pop 를 좌측 배치로 사용 */}
      <div
        id="auth-dock"
        className={`pop ${open ? 'open' : ''}`}
        style={{ left: 0, right: 'auto' }}
        role="dialog"
        aria-modal="true"
        aria-label="계정 설정"
      >
        {!isAuthed ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <h4 style={{ margin: '0 0 6px' }}>로그인</h4>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>아이디</span>
              <input
                type="text"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                placeholder="관리자 아이디"
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>비밀번호</span>
              <input
                type="password"
                value={pwInput}
                onChange={(e) => setPwInput(e.target.value)}
                placeholder="비밀번호"
              />
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setOpen(false)}>닫기</button>
              <button onClick={handleLogin}>로그인</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 20 }}>👤</div>
              <div style={{ fontWeight: 700 }}>{displayId}</div>
            </div>

            {!editMode ? (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setOpen(false)}>닫기</button>
                <button onClick={() => setEditMode(true)}>정보 편집</button>
                <button onClick={handleLogout}>로그아웃</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <h4 style={{ margin: 0 }}>비밀번호 변경</h4>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span>현재 비밀번호</span>
                  <input
                    type="password"
                    value={currPw}
                    onChange={(e) => setCurrPw(e.target.value)}
                    placeholder="현재 비밀번호"
                  />
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span>새 비밀번호</span>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="새 비밀번호"
                  />
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span>새 비밀번호 재입력</span>
                  <input
                    type="password"
                    value={newPw2}
                    onChange={(e) => setNewPw2(e.target.value)}
                    placeholder="새 비밀번호 다시 입력"
                  />
                </label>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setCurrPw('');
                      setNewPw('');
                      setNewPw2('');
                    }}
                  >
                    취소
                  </button>
                  <button onClick={handleChangePassword}>비밀번호 변경</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
