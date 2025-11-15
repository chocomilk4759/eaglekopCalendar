'use client';
import { useEffect, useState } from 'react';
import PresetsPanel from './PresetsPanel';
import { safeSetItem } from '@/lib/localStorageUtils';

const STORAGE_KEY = 'presets-dock-collapsed';

export default function PresetsDock({ canEdit }: { canEdit: boolean }) {
  // ✅ 초기 접힘 상태 (localStorage에서 복원, 기본값은 true)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // collapsed 상태가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeSetItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  // 폭이 좁아지는 순간(아이콘 숨김 구간) 자동 접힘
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(max-width: 1199.98px)');

    const apply = () => {
      // 화면이 좁아질 때만 자동으로 접기
      if (mq.matches) {
        setCollapsed(true);
      }
      // 화면이 넓어질 때는 사용자가 마지막으로 설정한 상태 유지 (자동으로 열지 않음)
    };

    // 최신 브라우저
    if (mq.addEventListener) {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    // 구 Safari 대응
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mq as any).addListener(apply);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mq as any).removeListener(apply);
    };
  }, []);

  return (
    <aside
      className={`presets-dock ${collapsed ? 'collapsed' : ''}`}
      data-collapsed={collapsed ? '1' : '0'}
      aria-label="프리셋 도크"
    >
      <div className="dock-toggle-wrap">
        <button
          type="button"
          className="dock-toggle"
          aria-label={collapsed ? '프리셋 펼치기' : '프리셋 접기'}
          aria-expanded={!collapsed}
          title={collapsed ? '펼치기' : '접기'}
          onClick={() => setCollapsed((v) => !v)}
        >
          <span aria-hidden style={{ justifyContent: 'center' }}>
            {collapsed ? '<' : '>'}
          </span>
        </button>
      </div>

      {/* ▼ 스크롤 박스: 칩은 이 안에서만 스크롤 */}
      {/* 성능 최적화: 접힌 상태에서는 PresetsPanel을 DOM에서 제거 */}
      {!collapsed && (
        <div className="dock-scrollbox" role="region" aria-label="프리셋 스크롤 영역">
          <PresetsPanel canEdit={canEdit} mode="vertical" />
        </div>
      )}
    </aside>
  );
}
