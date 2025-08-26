'use client';
import PresetsPanel from './PresetsPanel';

export default function PresetsDock({ canEdit }: { canEdit: boolean }) {
  return (
    <aside className="presets-dock" role="complementary" aria-label="프리셋 도크">
      <div className="dock-head">프리셋</div>
      {/* ✅ 세로 모드 */}
      <PresetsPanel canEdit={canEdit} mode="vertical" />
    </aside>
  );
}
