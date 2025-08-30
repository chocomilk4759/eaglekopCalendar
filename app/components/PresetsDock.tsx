'use client';
import { useEffect, useState } from 'react';
import PresetsPanel from './PresetsPanel';

export default function PresetsDock({ canEdit }: { canEdit: boolean }) {
  // ✅ 초기 접힘 상태
  const [collapsed, setCollapsed] = useState(true);

  // 폭이 좁아지는 순간(아이콘 숨김 구간) 자동 접힘
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(max-width: 1199.98px)');

    const apply = () => {
      if (mq.matches) setCollapsed(true);
    };

    apply();

    // 최신 브라우저
    if (mq.addEventListener) {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    // 구 Safari 대응
    // @ts-ignore
    mq.addListener(apply);
    return () => {
      // @ts-ignore
      mq.removeListener(apply);
    };
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


      {/* ▼ 스크롤 박스: 칩은 이 안에서만 스크롤 */}
      <div className="dock-scrollbox" role="region" aria-label="프리셋 스크롤 영역">
        <PresetsPanel canEdit={canEdit} mode="vertical" />
      </div>

    </aside>
  );
}
