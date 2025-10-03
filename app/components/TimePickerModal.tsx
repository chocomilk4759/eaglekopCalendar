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
  const [isDragging, setIsDragging] = useState(false);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartScroll = useRef<number>(0);
  const dragTarget = useRef<'hour' | 'minute' | null>(null);

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
      const itemHeight = 36;
      hourRef.current.scrollTop = parseInt(hour) * itemHeight;
    }
  }, [open]);

  useEffect(() => {
    if (open && minuteRef.current) {
      const itemHeight = 36;
      minuteRef.current.scrollTop = parseInt(minute) * itemHeight;
    }
  }, [open]);

  const handleHourScroll = () => {
    if (!hourRef.current || isDragging) return;
    const scrollTop = hourRef.current.scrollTop;
    const itemHeight = 36;
    const index = Math.round(scrollTop / itemHeight);
    const h = String(index).padStart(2, '0');
    if (h !== hour) setHour(h);
  };

  const handleMinuteScroll = () => {
    if (!minuteRef.current || isDragging) return;
    const scrollTop = minuteRef.current.scrollTop;
    const itemHeight = 36;
    const index = Math.round(scrollTop / itemHeight);
    const m = String(index).padStart(2, '0');
    if (m !== minute) setMinute(m);
  };

  // 마우스 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent, target: 'hour' | 'minute') => {
    const ref = target === 'hour' ? hourRef : minuteRef;
    if (!ref.current) return;
    setIsDragging(true);
    dragTarget.current = target;
    dragStartY.current = e.clientY;
    dragStartScroll.current = ref.current.scrollTop;
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging || !dragTarget.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ref = dragTarget.current === 'hour' ? hourRef : minuteRef;
      if (!ref.current) return;
      const deltaY = dragStartY.current - e.clientY;
      ref.current.scrollTop = dragStartScroll.current + deltaY;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragTarget.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // 터치 드래그 핸들러
  const handleTouchStart = (e: React.TouchEvent, target: 'hour' | 'minute') => {
    const ref = target === 'hour' ? hourRef : minuteRef;
    if (!ref.current) return;
    setIsDragging(true);
    dragTarget.current = target;
    dragStartY.current = e.touches[0].clientY;
    dragStartScroll.current = ref.current.scrollTop;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !dragTarget.current) return;
    const ref = dragTarget.current === 'hour' ? hourRef : minuteRef;
    if (!ref.current) return;
    const deltaY = dragStartY.current - e.touches[0].clientY;
    ref.current.scrollTop = dragStartScroll.current + deltaY;
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    dragTarget.current = null;
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
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ padding: '16px', minWidth: 240, maxWidth: 280 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>시작 시간</h3>

        {/* 직접 입력 (PC) */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <input
            type="text"
            value={hour}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 2);
              const num = parseInt(val || '0');
              if (num >= 0 && num <= 23) {
                setHour(val.padStart(2, '0'));
                if (hourRef.current) {
                  hourRef.current.scrollTop = num * 36;
                }
              }
            }}
            style={{
              width: 45,
              padding: '6px',
              textAlign: 'center',
              fontSize: 16,
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontWeight: 600
            }}
            maxLength={2}
          />
          <span style={{ fontSize: 18, fontWeight: 600 }}>:</span>
          <input
            type="text"
            value={minute}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 2);
              const num = parseInt(val || '0');
              if (num >= 0 && num <= 59) {
                setMinute(val.padStart(2, '0'));
                if (minuteRef.current) {
                  minuteRef.current.scrollTop = num * 36;
                }
              }
            }}
            style={{
              width: 45,
              padding: '6px',
              textAlign: 'center',
              fontSize: 16,
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontWeight: 600
            }}
            maxLength={2}
          />
        </div>

        {/* 드래그 스크롤 선택 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <div
            ref={hourRef}
            onScroll={handleHourScroll}
            onMouseDown={(e) => handleMouseDown(e, 'hour')}
            onTouchStart={(e) => handleTouchStart(e, 'hour')}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              height: 108,
              width: 50,
              overflowY: 'scroll',
              scrollSnapType: 'y mandatory',
              border: '1px solid var(--border)',
              borderRadius: 6,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              cursor: isDragging && dragTarget.current === 'hour' ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
          >
            <div style={{ height: 36 }} />
            {hours.map((h) => (
              <div
                key={h}
                style={{
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  scrollSnapAlign: 'start',
                  fontSize: 15,
                  fontWeight: h === hour ? 700 : 400,
                  color: h === hour ? 'var(--text)' : 'var(--text-secondary)',
                  transition: 'all 0.15s'
                }}
              >
                {h}
              </div>
            ))}
            <div style={{ height: 36 }} />
          </div>

          <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>:</span>

          <div
            ref={minuteRef}
            onScroll={handleMinuteScroll}
            onMouseDown={(e) => handleMouseDown(e, 'minute')}
            onTouchStart={(e) => handleTouchStart(e, 'minute')}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              height: 108,
              width: 50,
              overflowY: 'scroll',
              scrollSnapType: 'y mandatory',
              border: '1px solid var(--border)',
              borderRadius: 6,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              cursor: isDragging && dragTarget.current === 'minute' ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
          >
            <div style={{ height: 36 }} />
            {minutes.map((m) => (
              <div
                key={m}
                style={{
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  scrollSnapAlign: 'start',
                  fontSize: 15,
                  fontWeight: m === minute ? 700 : 400,
                  color: m === minute ? 'var(--text)' : 'var(--text-secondary)',
                  transition: 'all 0.15s'
                }}
              >
                {m}
              </div>
            ))}
            <div style={{ height: 36 }} />
          </div>
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
