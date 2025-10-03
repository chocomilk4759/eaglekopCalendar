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
  const dragTarget = useRef<'hour' | 'minute' | null>(null);
  const lastY = useRef<number>(0);
  const accumulatedDelta = useRef<number>(0);
  const dragStartScroll = useRef<number>(0);

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
      const containerHeight = 120;
      const centerOffset = (containerHeight - itemHeight) / 2;
      hourRef.current.scrollTop = parseInt(hour) * itemHeight + centerOffset;
    }
  }, [open]);

  useEffect(() => {
    if (open && minuteRef.current) {
      const itemHeight = 40;
      const containerHeight = 120;
      const centerOffset = (containerHeight - itemHeight) / 2;
      minuteRef.current.scrollTop = parseInt(minute) * itemHeight + centerOffset;
    }
  }, [open]);

  // 스크롤 이벤트로 시간 값 업데이트
  const handleHourScroll = () => {
    if (!hourRef.current || isDragging) return;
    const scrollTop = hourRef.current.scrollTop;
    const itemHeight = 40;
    const containerHeight = 120;
    const centerOffset = (containerHeight - itemHeight) / 2;
    const index = Math.round((scrollTop - centerOffset) / itemHeight);
    const h = String(((index % 24) + 24) % 24).padStart(2, '0');
    if (h !== hour) {
      setHour(h);
    }
  };

  const handleMinuteScroll = () => {
    if (!minuteRef.current || isDragging) return;
    const scrollTop = minuteRef.current.scrollTop;
    const itemHeight = 40;
    const containerHeight = 120;
    const centerOffset = (containerHeight - itemHeight) / 2;
    const index = Math.round((scrollTop - centerOffset) / itemHeight);
    const m = String(((index % 60) + 60) % 60).padStart(2, '0');
    if (m !== minute) {
      setMinute(m);
    }
  };

  // 마우스 드래그로 무한 스크롤 (Pointer Lock)
  const handleMouseDown = (e: React.MouseEvent, target: 'hour' | 'minute') => {
    const ref = target === 'hour' ? hourRef : minuteRef;
    if (!ref.current) return;

    setIsDragging(true);
    dragTarget.current = target;
    lastY.current = e.clientY;
    accumulatedDelta.current = 0;
    dragStartScroll.current = ref.current.scrollTop;
    e.preventDefault();

    // Pointer Lock 요청
    ref.current.requestPointerLock();
  };

  useEffect(() => {
    if (!isDragging || !dragTarget.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ref = dragTarget.current === 'hour' ? hourRef : minuteRef;
      if (!ref.current) return;

      const maxValue = dragTarget.current === 'hour' ? 23 : 59;
      const itemHeight = 40;
      const containerHeight = 120;
      const centerOffset = (containerHeight - itemHeight) / 2;

      let delta = 0;

      // Pointer Lock이 활성화되어 있으면 movementY 사용
      if (document.pointerLockElement) {
        delta = -e.movementY;
      } else {
        // Pointer Lock이 아직 활성화 안됐으면 일반 좌표로 델타 계산
        delta = lastY.current - e.clientY;
        lastY.current = e.clientY;
      }

      // 스크롤 업데이트
      let newScroll = ref.current.scrollTop + delta;

      // 순환 처리
      const totalScroll = (maxValue + 1) * itemHeight;
      if (newScroll < centerOffset) {
        newScroll += totalScroll;
      } else if (newScroll > totalScroll + centerOffset) {
        newScroll -= totalScroll;
      }

      ref.current.scrollTop = newScroll;
      e.preventDefault();
      e.stopPropagation();
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      dragTarget.current = null;

      // Pointer Lock 해제
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }

      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('mousemove', handleMouseMove, { capture: true });
    window.addEventListener('mouseup', handleMouseUp, { capture: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    };
  }, [isDragging]);

  // 터치 드래그로 무한 스크롤
  const handleTouchStart = (e: React.TouchEvent, target: 'hour' | 'minute') => {
    const ref = target === 'hour' ? hourRef : minuteRef;
    if (!ref.current) return;

    setIsDragging(true);
    dragTarget.current = target;
    lastY.current = e.touches[0].clientY;
    accumulatedDelta.current = 0;
    dragStartScroll.current = ref.current.scrollTop;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !dragTarget.current) return;
    const ref = dragTarget.current === 'hour' ? hourRef : minuteRef;
    if (!ref.current) return;

    const maxValue = dragTarget.current === 'hour' ? 23 : 59;
    const itemHeight = 40;
    const containerHeight = 120;
    const centerOffset = (containerHeight - itemHeight) / 2;

    // 델타 계산
    const currentDelta = lastY.current - e.touches[0].clientY;
    accumulatedDelta.current += currentDelta;
    lastY.current = e.touches[0].clientY;

    // 스크롤 업데이트
    let newScroll = dragStartScroll.current + accumulatedDelta.current;

    // 순환 처리
    const totalScroll = (maxValue + 1) * itemHeight;
    while (newScroll < centerOffset) {
      newScroll += totalScroll;
      dragStartScroll.current += totalScroll;
    }
    while (newScroll > totalScroll + centerOffset) {
      newScroll -= totalScroll;
      dragStartScroll.current -= totalScroll;
    }

    ref.current.scrollTop = newScroll;
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    dragTarget.current = null;
    accumulatedDelta.current = 0;
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

  // 단일 세트만 표시
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
              const containerHeight = 120;
              const centerOffset = (containerHeight - itemHeight) / 2;
              if (val === '') {
                setHour('00');
                if (hourRef.current) hourRef.current.scrollTop = centerOffset;
              } else {
                const num = parseInt(val);
                const formatted = String(num).padStart(2, '0');
                setHour(formatted);
                if (hourRef.current) {
                  hourRef.current.scrollTop = num * itemHeight + centerOffset;
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
              const containerHeight = 120;
              const centerOffset = (containerHeight - itemHeight) / 2;
              if (val === '') {
                setMinute('00');
                if (minuteRef.current) minuteRef.current.scrollTop = centerOffset;
              } else {
                const num = parseInt(val);
                const formatted = String(num).padStart(2, '0');
                setMinute(formatted);
                if (minuteRef.current) {
                  minuteRef.current.scrollTop = num * itemHeight + centerOffset;
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
            onMouseDown={(e) => handleMouseDown(e, 'hour')}
            onTouchStart={(e) => handleTouchStart(e, 'hour')}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              height: 120,
              width: 60,
              overflowY: 'scroll',
              scrollSnapType: 'y mandatory',
              borderRadius: 8,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              userSelect: 'none',
              cursor: isDragging && dragTarget.current === 'hour' ? 'grabbing' : 'grab',
              position: 'relative'
            }}
          >
            <div style={{ height: 40 }} />
            {hours.map((h) => (
              <div
                key={h}
                onClick={() => {
                  setHour(h);
                  if (hourRef.current) {
                    const itemHeight = 40;
                    const containerHeight = 120;
                    const centerOffset = (containerHeight - itemHeight) / 2;
                    hourRef.current.scrollTop = parseInt(h) * itemHeight + centerOffset;
                  }
                }}
                style={{
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  scrollSnapAlign: 'center',
                  fontSize: h === hour ? 24 : 16,
                  fontWeight: h === hour ? 700 : 400,
                  color: h === hour ? 'var(--text)' : 'var(--text-secondary)',
                  opacity: h === hour ? 1 : 0.4,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                {h}
              </div>
            ))}
            <div style={{ height: 40 }} />
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
              height: 120,
              width: 60,
              overflowY: 'scroll',
              scrollSnapType: 'y mandatory',
              borderRadius: 8,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              userSelect: 'none',
              cursor: isDragging && dragTarget.current === 'minute' ? 'grabbing' : 'grab',
              position: 'relative'
            }}
          >
            <div style={{ height: 40 }} />
            {minutes.map((m) => (
              <div
                key={m}
                onClick={() => {
                  setMinute(m);
                  if (minuteRef.current) {
                    const itemHeight = 40;
                    const containerHeight = 120;
                    const centerOffset = (containerHeight - itemHeight) / 2;
                    minuteRef.current.scrollTop = parseInt(m) * itemHeight + centerOffset;
                  }
                }}
                style={{
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  scrollSnapAlign: 'center',
                  fontSize: m === minute ? 24 : 16,
                  fontWeight: m === minute ? 700 : 400,
                  color: m === minute ? 'var(--text)' : 'var(--text-secondary)',
                  opacity: m === minute ? 1 : 0.4,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                {m}
              </div>
            ))}
            <div style={{ height: 40 }} />
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
