'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import TimePickerModal from './TimePickerModal';

export type ModifyChipMode = 'add' | 'edit';
export type ChipPreset = { emoji: string | null; label: string };

export default function ModifyChipInfoModal({
  open,
  mode,
  preset,
  initialText = '',
  initialStartTime = '',
  initialNextDay = false,
  onSave,
  onDelete,
  onClose,
  canEdit = false,
  title,
  onRest,
  showRestButton = false,
}:{
  open: boolean;
  mode: ModifyChipMode;          // 'add' | 'edit'
  preset: ChipPreset;            // 아이콘/라벨
  initialText?: string;
  initialStartTime?: string;
  initialNextDay?: boolean;
  onSave: (text: string, startTime: string, nextDay: boolean, selectedPreset?: ChipPreset) => void;
  onDelete?: () => void;
  onClose: () => void;
  canEdit?: boolean;
  title?: React.ReactNode;
  onRest?: () => void;
  showRestButton?: boolean;
}) {
  const [text, setText] = useState(initialText);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [nextDay, setNextDay] = useState(initialNextDay);
  const [localPreset, setLocalPreset] = useState<ChipPreset>(preset);
  const [iconOpen, setIconOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [options, setOptions] = useState<ChipPreset[]>([]);
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setStartTime(initialStartTime);
      setNextDay(initialNextDay);
      setLocalPreset(preset);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, initialText, initialStartTime, initialNextDay, preset]);

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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal" onMouseDown={handleBackdropClick}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div style={{marginBottom:8, fontSize:12, fontWeight:700, opacity:.85}}>
            {title}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 첫 번째 행: 아이콘 + 텍스트 입력 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, minWidth: 0 }}
            />
          </div>

          {/* 두 번째 행: 시간 설정 + 액션 버튼들 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* 시간 설정 버튼 */}
            <button
              type="button"
              onClick={() => setTimePickerOpen(true)}
              aria-label="시간 설정"
              style={{ fontSize: 12, whiteSpace: 'nowrap', padding: '6px 10px' }}
            >
              {startTime ? `${startTime}${nextDay ? '+1' : ''}` : '시간'}
            </button>

            {/* ★ Ctrl 다중 선택 모달일 때만: '휴방' 버튼 */}
            {showRestButton && canEdit && (
              <button type="button" onClick={onRest} aria-label="휴방 설정" style={{fontSize:12, padding: '6px 10px'}}>휴방</button>
            )}

            {/* 액션 버튼들 */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, fontSize: 12 }}>
              <button onClick={() => onSave(text.trim(), startTime.trim(), nextDay, localPreset)} aria-label="저장" style={{padding: '6px 12px'}}>저장</button>
              {mode === 'add' ? (
                <button onClick={onClose} aria-label="취소" style={{padding: '6px 12px'}}>취소</button>
              ) : (
                <>
                  <button
                    onClick={onDelete}
                    aria-label="삭제"
                    style={{ borderColor: '#b12a2a', color: '#b12a2a', fontSize: 12, padding: '6px 12px' }}
                  >
                    삭제
                  </button>
                  <button onClick={onClose} aria-label="닫기" style={{ fontSize: 12, padding: '6px 12px' }}>닫기</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 시간 설정 모달 */}
      <TimePickerModal
        open={timePickerOpen}
        initialTime={startTime}
        initialNextDay={nextDay}
        onSave={(time, nd) => {
          setStartTime(time);
          setNextDay(nd);
        }}
        onClose={() => setTimePickerOpen(false)}
      />
    </div>
  );
}
