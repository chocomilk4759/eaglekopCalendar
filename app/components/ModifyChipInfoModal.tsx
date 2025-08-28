'use client';

import { useEffect, useRef, useState } from 'react';

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
}:{
  open: boolean;
  mode: ModifyChipMode;          // 'add' → 저장/취소, 'edit' → 저장/삭제/닫기
  preset: ChipPreset;            // 아이콘/라벨(라벨·아이콘은 고정)
  initialText?: string;          // 기존 텍스트
  onSave: (text: string) => void;
  onDelete?: () => void;         // edit 전용
  onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setText(initialText);
      // 포커스
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, initialText]);

  if (!open) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 아이콘(수정 불가) */}
          <div
            aria-label="고정 아이콘"
            title="프리셋에 저장된 아이콘(수정 불가)"
            style={{
              width: 36, height: 36, borderRadius: 18,
              display: 'grid', placeItems: 'center',
              border: '1px solid var(--border)', background: '#fff', fontSize: 18,
              flex: '0 0 36px',
            }}
          >
            {preset.emoji ?? '•'}
          </div>

          {/* 텍스트만 수정 */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="내용 입력 (아이콘은 고정)"
            aria-label="칩 내용"
            style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8 }}
          />

          {/* 액션 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onSave(text.trim())} aria-label="저장">저장</button>
            {mode === 'add' ? (
              <button onClick={onClose} aria-label="취소">취소</button>
            ) : (
              <>
                <button
                  onClick={onDelete}
                  aria-label="삭제"
                  style={{ borderColor: '#b12a2a', color: '#b12a2a' }}
                >
                  삭제
                </button>
                <button onClick={onClose} aria-label="닫기">닫기</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
