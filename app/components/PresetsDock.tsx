'use client';
import { useEffect, useState } from 'react';
import PresetsPanel from './PresetsPanel';

export default function PresetsDock({ canEdit }: { canEdit: boolean }) {
  // ✅ 초기 접힘 상태
  const [collapsed, setCollapsed] = useState(true);

  // 폭이 좁아지는 순간(아이콘 숨김 구간) 자동 접힘
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1199.98px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in e ? e.matches : e.matches;
      if (matches) setCollapsed(true);
    };
    handler(mq);
    mq.addEventListener('change', handler as any);
    return () => mq.removeEventListener('change', handler as any);
  }, []);

  return (
    <aside
      className={`presets-dock ${collapsed ? 'collapsed' : ''}`}
      data-collapsed={collapsed ? '1' : '0'}
      role="complementary"
      aria-label="프리셋 도크"
      aria-expanded={!collapsed}
    >
      <div className="dock-toggle-wrap">
        <button
          type="button"
          className="dock-toggle"
          aria-label={collapsed ? '프리셋 펼치기' : '프리셋 접기'}
          title={collapsed ? '펼치기' : '접기'}
          onClick={() => setCollapsed(v => !v)}
        >
          <span aria-hidden style={{justifyContent:'center'}}>{collapsed ? '<' : '>'}</span>
        </button>
      </div>


      <div className="preset-vertical-list">
        <PresetsPanel canEdit={canEdit} mode="vertical" />
      </div>
    </aside>
  );
}
