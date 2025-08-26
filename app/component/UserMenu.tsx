'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

export default function UserMenu() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    alert('로그아웃되었습니다.');
    location.href = '/';
  }

  if (!email) return null;

  return (
    <div style={{
      position: 'fixed', top: 12, right: 12, display: 'flex', gap: 8
    }}>
      <Link href="/account" className="btn">정보편집</Link>
      <button onClick={logout} className="btn">로그아웃</button>
      <style jsx>{`
        .btn {
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          font-size: 14px;
        }
        .btn:hover { background: #f7f7f7; }
      `}</style>
    </div>
  );
}
