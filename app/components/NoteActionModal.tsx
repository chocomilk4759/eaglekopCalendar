'use client';

export default function NoteActionModal({
  open,
  onClose,
  onMove,
  onOverwrite,
  onMerge,
  sourceDate,
  targetDate,
}: {
  open: boolean;
  onClose: () => void;
  onMove: () => void;
  onOverwrite: () => void;
  onMerge: () => void;
  sourceDate: string;
  targetDate: string;
}) {
  if (!open) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div
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
        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>날짜 동작 선택</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, opacity: 0.8 }}>
          <strong>{sourceDate}</strong>의 내용을 <strong>{targetDate}</strong>에 어떻게 처리할까요?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
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
            onClick={onOverwrite}
            style={{
              padding: '12px 16px',
              fontSize: 15,
              borderRadius: 8,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            복사 후 덮어쓰기
          </button>
          <button
            onClick={onMerge}
            style={{
              padding: '12px 16px',
              fontSize: 15,
              borderRadius: 8,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            복사 후 합치기
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
