'use client';

import { useEffect, useRef, useState } from 'react';

interface TimePickerModalProps {
  open: boolean;
  initialTime?: string; // HH:mm 형식
  initialNextDay?: boolean;
  onSave: (time: string, nextDay: boolean) => void;
  onClose: () => void;
}

export default function TimePickerModal({ open, initialTime = '00:00', initialNextDay = false, onSave, onClose }: TimePickerModalProps) {
  const [hour, setHour] = useState('00');
  const [minute, setMinute] = useState('00');
  const [nextDay, setNextDay] = useState(initialNextDay);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 초기값 파싱 + 포커스 관리
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      if (initialTime) {
        const [h, m] = initialTime.split(':');
        setHour(h?.padStart(2, '0') || '00');
        setMinute(m?.padStart(2, '0') || '00');
      } else {
        setHour('00');
        setMinute('00');
      }
      setNextDay(initialNextDay);
      // 첫 번째 input으로 포커스 이동
      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector<HTMLInputElement>('input[type="text"]');
        firstInput?.focus();
      }, 0);
    } else {
      // 모달 닫힐 때: 이전 포커스 복원
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    }
  }, [open, initialTime, initialNextDay]);

  const handleSave = () => {
    // 빈 값 보정 및 범위 검증 (0-23시, 0-59분)
    const hourNum = Math.max(0, Math.min(23, parseInt(hour) || 0));
    const minuteNum = Math.max(0, Math.min(59, parseInt(minute) || 0));

    const validHour = String(hourNum).padStart(2, '0');
    const validMinute = String(minuteNum).padStart(2, '0');

    onSave(`${validHour}:${validMinute}`, nextDay);
    onClose();
  };

  const handleClear = () => {
    onSave('', false);
    onClose();
  };

  // Focus trap: Tab/Shift+Tab을 가로채서 모달 내부에서만 순환
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal" onMouseDown={handleBackdropClick} style={{ zIndex: 1001 }}>
      <div ref={modalRef} className="sheet" onClick={(e) => e.stopPropagation()} style={{ padding: '16px', minWidth: 240, maxWidth: 280 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600 }}>시작 시간</h3>

        {/* 시간 입력 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <input
            type="text"
            value={hour}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val === '') {
                setHour('');
                return;
              }
              const num = parseInt(val);
              if (num >= 0 && num <= 23) {
                setHour(val);
              }
            }}
            onBlur={(e) => {
              const val = e.target.value;
              if (val === '') {
                setHour('00');
              } else {
                const num = parseInt(val);
                const formatted = String(num).padStart(2, '0');
                setHour(formatted);
              }
            }}
            onFocus={(e) => {
              e.target.select();
            }}
            style={{
              width: 60,
              padding: '10px',
              textAlign: 'center',
              fontSize: 20,
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontWeight: 600
            }}
            placeholder="00"
            maxLength={2}
          />
          <span style={{ fontSize: 24, fontWeight: 600 }}>:</span>
          <input
            type="text"
            value={minute}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val === '') {
                setMinute('');
                return;
              }
              const num = parseInt(val);
              if (num >= 0 && num <= 59) {
                setMinute(val);
              }
            }}
            onBlur={(e) => {
              const val = e.target.value;
              if (val === '') {
                setMinute('00');
              } else {
                const num = parseInt(val);
                const formatted = String(num).padStart(2, '0');
                setMinute(formatted);
              }
            }}
            onFocus={(e) => {
              e.target.select();
            }}
            style={{
              width: 60,
              padding: '10px',
              textAlign: 'center',
              fontSize: 20,
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontWeight: 600
            }}
            placeholder="00"
            maxLength={2}
          />
        </div>

        {/* 다음날 체크박스 */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 13, justifyContent: 'center' }}>
          <input
            type="checkbox"
            checked={nextDay}
            onChange={(e) => setNextDay(e.target.checked)}
          />
          다음날 (+1)
        </label>

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button onClick={handleClear} style={{ fontSize: 12, padding: '6px 10px' }}>제거</button>
          <button onClick={handleSave} style={{ fontSize: 12, padding: '6px 10px' }}>확인</button>
          <button onClick={onClose} style={{ fontSize: 12, padding: '6px 10px' }}>취소</button>
        </div>

        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </div>
  );
}
