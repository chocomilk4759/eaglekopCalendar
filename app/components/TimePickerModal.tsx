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

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  // 초기값 파싱
  useEffect(() => {
    if (open) {
      if (initialTime) {
        const [h, m] = initialTime.split(':');
        setHour(h?.padStart(2, '0') || '00');
        setMinute(m?.padStart(2, '0') || '00');
      } else {
        setHour('00');
        setMinute('00');
      }
      setNextDay(initialNextDay);
    }
  }, [open, initialTime, initialNextDay]);

  // 초기 스크롤 위치 설정
  useEffect(() => {
    if (open && hourRef.current) {
      const itemHeight = 40;
      hourRef.current.scrollTop = parseInt(hour) * itemHeight;
    }
  }, [open]);

  useEffect(() => {
    if (open && minuteRef.current) {
      const itemHeight = 40;
      minuteRef.current.scrollTop = parseInt(minute) * itemHeight;
    }
  }, [open]);

  const handleHourScroll = () => {
    if (!hourRef.current) return;
    const scrollTop = hourRef.current.scrollTop;
    const itemHeight = 40;
    const index = Math.round(scrollTop / itemHeight);
    const h = String(index).padStart(2, '0');
    if (h !== hour) setHour(h);
  };

  const handleMinuteScroll = () => {
    if (!minuteRef.current) return;
    const scrollTop = minuteRef.current.scrollTop;
    const itemHeight = 40;
    const index = Math.round(scrollTop / itemHeight);
    const m = String(index).padStart(2, '0');
    if (m !== minute) setMinute(m);
  };

  const handleSave = () => {
    onSave(`${hour}:${minute}`, nextDay);
    onClose();
  };

  const handleClear = () => {
    onSave('', false);
    onClose();
  };

  if (!open) return null;

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div className="modal" onClick={onClose} style={{ zIndex: 1001 }}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ padding: '20px', minWidth: 280 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>시작 시간 설정</h3>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          {/* 시간 선택 */}
          <div
            ref={hourRef}
            onScroll={handleHourScroll}
            style={{
              height: 160,
              width: 70,
              overflowY: 'scroll',
              scrollSnapType: 'y mandatory',
              border: '1px solid var(--border)',
              borderRadius: 8,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              position: 'relative'
            }}
          >
            <div style={{ height: 60 }} />
            {hours.map((h) => (
              <div
                key={h}
                onClick={() => {
                  setHour(h);
                  if (hourRef.current) {
                    hourRef.current.scrollTo({ top: parseInt(h) * 40, behavior: 'smooth' });
                  }
                }}
                style={{
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  scrollSnapAlign: 'start',
                  fontSize: 18,
                  fontWeight: h === hour ? 700 : 400,
                  color: h === hour ? 'var(--text)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {h}
              </div>
            ))}
            <div style={{ height: 60 }} />
          </div>

          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>:</span>

          {/* 분 선택 */}
          <div
            ref={minuteRef}
            onScroll={handleMinuteScroll}
            style={{
              height: 160,
              width: 70,
              overflowY: 'scroll',
              scrollSnapType: 'y mandatory',
              border: '1px solid var(--border)',
              borderRadius: 8,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              position: 'relative'
            }}
          >
            <div style={{ height: 60 }} />
            {minutes.map((m) => (
              <div
                key={m}
                onClick={() => {
                  setMinute(m);
                  if (minuteRef.current) {
                    minuteRef.current.scrollTo({ top: parseInt(m) * 40, behavior: 'smooth' });
                  }
                }}
                style={{
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  scrollSnapAlign: 'start',
                  fontSize: 18,
                  fontWeight: m === minute ? 700 : 400,
                  color: m === minute ? 'var(--text)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {m}
              </div>
            ))}
            <div style={{ height: 60 }} />
          </div>
        </div>

        {/* 다음날 체크박스 */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 14, justifyContent: 'center' }}>
          <input
            type="checkbox"
            checked={nextDay}
            onChange={(e) => setNextDay(e.target.checked)}
          />
          다음날 (+1)
        </label>

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={handleClear} style={{ fontSize: 13 }}>시간 제거</button>
          <button onClick={handleSave} style={{ fontSize: 13 }}>확인</button>
          <button onClick={onClose} style={{ fontSize: 13 }}>취소</button>
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
