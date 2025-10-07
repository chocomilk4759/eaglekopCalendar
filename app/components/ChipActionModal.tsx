'use client';

import { useEffect, useRef } from 'react';

export default function ChipActionModal({
  open,
  onClose,
  onMove,
  onCopy,
  chipLabel
}: {
  open: boolean;
  onClose: () => void;
  onMove: () => void;
  onCopy: () => void;
  chipLabel: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // Focus first button on open
    firstButtonRef.current?.focus();

    // Esc key handler
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleEsc);
    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('keydown', handleTab);
    };
  }, [open, onClose]);

  if (!open) return null;

  const titleId = 'chip-action-modal-title';
  const descId = 'chip-action-modal-desc';

  return (
    <div className="modal" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="sheet"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(400px, 90vw)',
          padding: '24px',
          borderRadius: '12px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId} style={{ margin: '0 0 16px', fontSize: 18 }}>일정 동작 선택</h3>
        <p id={descId} style={{ margin: '0 0 20px', fontSize: 14, opacity: 0.8 }}>
          <strong>{chipLabel}</strong>을(를) 어떻게 처리할까요?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            ref={firstButtonRef}
            onClick={onMove}
            style={{
              padding: '12px 16px',
              fontSize: 15,
              borderRadius: 8,
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            이동 (원본 삭제)
          </button>
          <button
            onClick={onCopy}
            style={{
              padding: '12px 16px',
              fontSize: 15,
              borderRadius: 8,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            복사 (원본 유지)
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 16px',
              fontSize: 15,
              borderRadius: 8,
              background: 'transparent',
              border: '1px dashed var(--border)',
              cursor: 'pointer',
              opacity: 0.7,
            }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
