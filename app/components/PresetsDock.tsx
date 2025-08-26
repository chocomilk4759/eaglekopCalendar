'use client';
import { useState } from 'react';
import PresetsPanel from './PresetsPanel';

export default function PresetsDock({ canEdit }: { canEdit: boolean }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`presets-dock ${collapsed ? 'collapsed' : ''}`}
      role="complementary"
      aria-label="프리셋 도크"
      aria-expanded={!collapsed}
    >
      {/* 접기/펼치기 버튼 */}
      <div className="dock-toggle-wrap">
        <button
          type="button"
          className="dock-toggle"
          aria-label={collapsed ? '프리셋 펼치기' : '프리셋 접기'}
          title={collapsed ? '펼치기' : '접기'}
          onClick={() => setCollapsed(v => !v)}
        >
          <span aria-hidden>{collapsed ? '‹' : '›'}</span>
        </button>
      </div>

      <div className="dock-head">프리셋</div>

      <div className="preset-vertical-list">
        <PresetsPanel canEdit={canEdit} mode="vertical" />
      </div>
    </aside>
  );
}
