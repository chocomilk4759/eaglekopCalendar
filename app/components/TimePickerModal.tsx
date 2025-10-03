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

  // 스크롤 위치로부터 보이는 값들을 계산
  const getVisibleValues = (scrollTop: number, totalCount: number) => {
    const itemHeight = 40;
    const containerHeight = 120;
    const bufferCount = 5; // 앞뒤로 여유롭게 렌더링할 항목 수

    const centerIndex = Math.round(scrollTop / itemHeight);
    const startIndex = Math.max(0, centerIndex - bufferCount);
    const endIndex = Math.min(totalCount - 1, centerIndex + bufferCount);

    return { centerIndex: centerIndex % totalCount, startIndex, endIndex };
  };

  // 포인터(선택된 값) 업데이트
  const handleHourScroll = () => {
    if (!hourRef.current) return;
    const { centerIndex } = getVisibleValues(hourRef.current.scrollTop, 24);
    const h = String(centerIndex).padStart(2, '0');
    if (h !== hour) {
      setHour(h);
    }
  };

  const handleMinuteScroll = () => {
    if (!minuteRef.current) return;
    const { centerIndex } = getVisibleValues(minuteRef.current.scrollTop, 60);
    const m = String(centerIndex).padStart(2, '0');
    if (m !== minute) {
      setMinute(m);
    }
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

  // 단일 배열 (00~23, 00~59)
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal" onMouseDown={handleBackdropClick} style={{ zIndex: 1001 }}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ padding: '16px', minWidth: 240, maxWidth: 280 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>시작 시간</h3>

        {/* 직접 입력 (PC) */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
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
              const itemHeight = 40;
              if (val === '') {
                setHour('00');
                if (hourRef.current) hourRef.current.scrollTop = 0;
              } else {
                const num = parseInt(val);
                const formatted = String(num).padStart(2, '0');
                setHour(formatted);
                if (hourRef.current) {
                  hourRef.current.scrollTop = num * itemHeight;
                }
              }
            }}
            onFocus={(e) => {
              e.target.select();
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
            placeholder="00"
            maxLength={2}
          />
          <span style={{ fontSize: 18, fontWeight: 600 }}>:</span>
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
              const itemHeight = 40;
              if (val === '') {
                setMinute('00');
                if (minuteRef.current) minuteRef.current.scrollTop = 0;
              } else {
                const num = parseInt(val);
                const formatted = String(num).padStart(2, '0');
                setMinute(formatted);
                if (minuteRef.current) {
                  minuteRef.current.scrollTop = num * itemHeight;
                }
              }
            }}
            onFocus={(e) => {
              e.target.select();
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
            placeholder="00"
            maxLength={2}
          />
        </div>

        {/* 드래그 스크롤 선택 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <div
            ref={hourRef}
            onScroll={handleHourScroll}
            style={{
              height: 120,
              width: 60,
              overflowY: 'scroll',
              scrollSnapType: 'y mandatory',
              borderRadius: 8,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              userSelect: 'none',
              position: 'relative'
            }}
          >
            {hours.map((h, i) => {
              const scrollTop = hourRef.current?.scrollTop ?? 0;
              const itemHeight = 40;
              const centerIndex = Math.round(scrollTop / itemHeight);
              const distanceFromCenter = Math.abs(i - centerIndex);
              const isCenter = i === centerIndex;

              return (
                <div
                  key={`hour-${i}`}
                  onClick={() => {
                    setHour(h);
                    if (hourRef.current) {
                      hourRef.current.scrollTop = i * itemHeight;
                    }
                  }}
                  style={{
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    scrollSnapAlign: 'center',
                    fontSize: isCenter ? 24 : Math.max(16, 24 - distanceFromCenter * 4),
                    fontWeight: isCenter ? 700 : 400,
                    color: 'var(--text)',
                    opacity: isCenter ? 1 : Math.max(0.3, 1 - distanceFromCenter * 0.2),
                    transition: 'all 0.15s ease',
                    cursor: 'pointer'
                  }}
                >
                  {h}
                </div>
              );
            })}
          </div>

          <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>:</span>

          <div
            ref={minuteRef}
            onScroll={handleMinuteScroll}
            style={{
              height: 120,
              width: 60,
              overflowY: 'scroll',
              scrollSnapType: 'y mandatory',
              borderRadius: 8,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              userSelect: 'none',
              position: 'relative'
            }}
          >
            {minutes.map((m, i) => {
              const scrollTop = minuteRef.current?.scrollTop ?? 0;
              const itemHeight = 40;
              const centerIndex = Math.round(scrollTop / itemHeight);
              const distanceFromCenter = Math.abs(i - centerIndex);
              const isCenter = i === centerIndex;

              return (
                <div
                  key={`minute-${i}`}
                  onClick={() => {
                    setMinute(m);
                    if (minuteRef.current) {
                      minuteRef.current.scrollTop = i * itemHeight;
                    }
                  }}
                  style={{
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    scrollSnapAlign: 'center',
                    fontSize: isCenter ? 24 : Math.max(16, 24 - distanceFromCenter * 4),
                    fontWeight: isCenter ? 700 : 400,
                    color: 'var(--text)',
                    opacity: isCenter ? 1 : Math.max(0.3, 1 - distanceFromCenter * 0.2),
                    transition: 'all 0.15s ease',
                    cursor: 'pointer'
                  }}
                >
                  {m}
                </div>
              );
            })}
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
