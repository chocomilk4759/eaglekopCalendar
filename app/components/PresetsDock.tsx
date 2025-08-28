'use client';
import { useEffect, useState } from 'react';
import PresetsPanel from './PresetsPanel';

export default function PresetsDock({ canEdit }: { canEdit: boolean }) {
  // ✅ 초기 접힘 상태
  const [collapsed, setCollapsed] = useState(true);

  // 화면이 compact(= column 레이아웃)으로 전환되면 강제로 접힘 유지
  useEffect(() => {
    const html = document.documentElement;
    const apply = () => {
      const compact = html.getAttribute('data-compact') === '1';
      if (compact) setCollapsed(true);
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(html, { attributes: true, attributeFilter: ['data-compact'] });
    return () => obs.disconnect();
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
