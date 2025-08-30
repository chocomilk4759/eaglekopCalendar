'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export type ModifyChipMode = 'add' | 'edit';
export type ChipPreset = { emoji: string | null; label: string };

export default function ModifyChipInfoModal({
  open,
  mode,
  preset,
  initialText = '',
  onSave,
  onDelete,
  onClose,
  canEdit = false,
}:{
  open: boolean;
  mode: ModifyChipMode;          // 'add' | 'edit'
  preset: ChipPreset;            // 아이콘/라벨
  initialText?: string;
  onSave: (text: string, selectedPreset?: ChipPreset) => void;
  onDelete?: () => void;
  onClose: () => void;
  canEdit?: boolean;
}) {
  const [text, setText] = useState(initialText);
  const [localPreset, setLocalPreset] = useState<ChipPreset>(preset);
  const [iconOpen, setIconOpen] = useState(false);
  const [options, setOptions] = useState<ChipPreset[]>([]);
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setLocalPreset(preset);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, initialText, preset]);

  // 모달이 닫히면 콤보도 닫기
  useEffect(() => {
    if (!open) setIconOpen(false);
  }, [open]);

  // 열릴 때(ADD/EDIT 공통) + 권한 있으면 옵션 프리페치
  useEffect(() => {
    if (open && canEdit) { void ensureOptions(); }
  }, [open, mode, canEdit]);

  async function ensureOptions(){
    if (options.length) return;
    const { data, error } = await supabase.from('presets').select('emoji,label');
    if (!error && data) {
      const seen = new Set<string>();
      const list: ChipPreset[] = [];
      for (const r of data) {
        const e = r.emoji ?? null;
        const key = e ?? 'null';
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({ emoji: e, label: String(r.label ?? '') });
      }
      setOptions(list);
    } else {
      setOptions([
        { emoji: '📢', label: '공지' }, { emoji: '🔔', label: '알림' },
        { emoji: '⚽', label: '축구' }, { emoji: '⚾', label: '야구' },
        { emoji: '🏁', label: 'F1' },  { emoji: '🥎', label: '촌지' },
        { emoji: '🏆', label: '대회' }, { emoji: '🎮', label: '게임' },
        { emoji: '📺', label: '함께' }, { emoji: '🤼‍♂️', label: '합방' },
        { emoji: '👄', label: '저챗' }, { emoji: '🍚', label: '광고' },
        { emoji: '🎤', label: '노래' }, { emoji: '💙', label: '컨텐츠' },
      ]);
    }
  }

  if (!open) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 아이콘 버튼(ADD/EDIT 공통, editor만) */}
          <div className="icon-chooser">
            <button
              type="button"
              className="icon-btn"
              aria-label="아이콘 변경"
              title={canEdit ? '아이콘 선택' : '아이콘은 수정할 수 없습니다'}
              onClick={async ()=>{ if(canEdit){ await ensureOptions(); setIconOpen(v=>!v); } }}
              disabled={!canEdit}
              style={{
                width: 36, height: 36, borderRadius: 18,
                display: 'grid', placeItems: 'center', lineHeight: 1,
                border: '1px solid var(--border)', background: '#fff', fontSize: 12,
                flex: '0 0 36px', cursor: canEdit ? 'pointer':'not-allowed'
              }}
            >
              <span className="emoji-glyph">{localPreset.emoji ?? '•'}</span>
            </button>

            {iconOpen && (
              <select
                className="icon-combo"
                onChange={(e)=>{
                  const idx = Number(e.target.value);
                  if (!Number.isNaN(idx) && options[idx]) {
                    const picked = options[idx];
                    setLocalPreset(prev => ({ ...prev, emoji: picked.emoji })); // 아이콘만 변경
                  }
                }}
                defaultValue=""
                aria-label="아이콘 선택"
                style={{ cursor:'default' }}
              >
                <option value="" disabled>아이콘 선택…</option>
                {options.map((p, i)=>(
                  <option key={`${p.emoji ?? '•'}-${i}`} value={i}>
                    {`${p.emoji ?? '•'} ${p.label}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 텍스트만 수정 */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="내용 입력"
            aria-label="칩 내용"
            style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          />

          {/* 액션 */}
          <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
            <button onClick={() => onSave(text.trim(), localPreset)} aria-label="저장">저장</button>
            {mode === 'add' ? (
              <button onClick={onClose} aria-label="취소">취소</button>
            ) : (
              <>
                <button
                  onClick={onDelete}
                  aria-label="삭제"
                  style={{ borderColor: '#b12a2a', color: '#b12a2a', fontSize: 12 }}
                >
                  삭제
                </button>
                <button onClick={onClose} aria-label="닫기" style={{ fontSize: 12 }}>닫기</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
