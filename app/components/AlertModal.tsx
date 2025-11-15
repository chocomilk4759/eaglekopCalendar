'use client';

import React from 'react';

export default function AlertModal({
  open,
  onClose,
  title,
  message,
  buttonText = '확인',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
}) {
  if (!open) return null;

  return (
    <div className="modal" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-desc"
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
        <h3 id="alert-title" style={{ margin: '0 0 16px', fontSize: 18 }}>{title}</h3>
        <p id="alert-desc" style={{ margin: '0 0 20px', fontSize: 14, opacity: 0.8, whiteSpace: 'pre-wrap' }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              borderRadius: 8,
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
