'use client';
import PresetsPanel from './PresetsPanel';

export default function PresetsDock({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="presets-dock" role="complementary" aria-label="프리셋 도크">
      <div className="presets-inline">
        <span className="presets-label day-name">프리셋</span>
        <div className="preset-strip">
          {/* PresetsPanel: 한 줄 모드 */}
          <PresetsPanel canEdit={canEdit} mode="inline" />
        </div>
      </div>
    </div>
  );
}
