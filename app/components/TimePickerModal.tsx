'use client';

import { useEffect, useRef, useState } from 'react';

interface TimePickerModalProps {
  open: boolean;
  initialTime?: string; // HH:mm 형식
  initialNextDay?: boolean;
  onSave: (time: string, nextDay: boolean) => void;
  onClose: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

export default function TimePickerModal({ open, initialTime = '00:00', initialNextDay = false, onSave, onClose, onDragStateChange }: TimePickerModalProps) {
  const [hour, setHour] = useState('00');
  const [minute, setMinute] = useState('00');
  const [nextDay, setNextDay] = useState(initialNextDay);
  const [isDragging, setIsDragging] = useState(false);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartScroll = useRef<number>(0);
  const dragTarget = useRef<'hour' | 'minute' | null>(null);
  const accumulatedDelta = useRef<number>(0);
  const lastY = useRef<number>(0);

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

  // 초기 스크롤 위치 설정 (중간 세트로 시작)
  useEffect(() => {
    if (open && hourRef.current) {
      const itemHeight = 36;
      // 중간 세트(24개 항목)로 시작
      hourRef.current.scrollTop = (24 + parseInt(hour)) * itemHeight;
    }
  }, [open]);

  useEffect(() => {
    if (open && minuteRef.current) {
      const itemHeight = 36;
      // 중간 세트(60개 항목)로 시작
      minuteRef.current.scrollTop = (60 + parseInt(minute)) * itemHeight;
    }
  }, [open]);

  const handleHourScroll = () => {
    if (!hourRef.current || isDragging) return;
    const scrollTop = hourRef.current.scrollTop;
    const itemHeight = 36;
    const index = Math.round(scrollTop / itemHeight);
    const h = String(index % 24).padStart(2, '0');
    if (h !== hour) setHour(h);
  };

  const handleMinuteScroll = () => {
    if (!minuteRef.current || isDragging) return;
    const scrollTop = minuteRef.current.scrollTop;
    const itemHeight = 36;
    const index = Math.round(scrollTop / itemHeight);
    const m = String(index % 60).padStart(2, '0');
    if (m !== minute) setMinute(m);
  };

  // 드래그 상태 변경 시 부모에게 알림
  useEffect(() => {
    onDragStateChange?.(isDragging);
  }, [isDragging, onDragStateChange]);

  // 마우스 드래그 핸들러 (무한 스크롤)
  const handleMouseDown = (e: React.MouseEvent, target: 'hour' | 'minute') => {
    const ref = target === 'hour' ? hourRef : minuteRef;
    if (!ref.current) return;

    setIsDragging(true);
    dragTarget.current = target;
    lastY.current = e.clientY;
    accumulatedDelta.current = 0;
    dragStartScroll.current = ref.current.scrollTop;
    e.preventDefault();

    // 커서 숨기기
    document.body.style.cursor = 'none';
  };

  useEffect(() => {
    if (!isDragging || !dragTarget.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ref = dragTarget.current === 'hour' ? hourRef : minuteRef;
      if (!ref.current) return;

      const maxValue = dragTarget.current === 'hour' ? 23 : 59;
      const itemHeight = 36;

      // 현재 프레임의 델타 계산
      const currentDelta = lastY.current - e.clientY;

      // 델타를 누적에 추가
      accumulatedDelta.current += currentDelta;

      // 다음 프레임을 위해 현재 위치 저장
      lastY.current = e.clientY;

      // 스크롤 업데이트 (누적 델타 기반)
      let newScroll = dragStartScroll.current + accumulatedDelta.current;
      const singleCycleScroll = maxValue * itemHeight;

      // 순환 처리 - 첫 번째 세트나 마지막 세트에 가까우면 중간으로 리셋
      if (newScroll < singleCycleScroll * 0.5) {
        // 첫 번째 세트 중반 이전이면 중간 세트로 점프
        newScroll += singleCycleScroll;
        dragStartScroll.current += singleCycleScroll;
        accumulatedDelta.current = newScroll - dragStartScroll.current;
      } else if (newScroll > singleCycleScroll * 2.5) {
        // 세 번째 세트 중반 이후면 중간 세트로 점프
        newScroll -= singleCycleScroll;
        dragStartScroll.current -= singleCycleScroll;
        accumulatedDelta.current = newScroll - dragStartScroll.current;
      }

      ref.current.scrollTop = newScroll;

      e.preventDefault();
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragTarget.current = null;
      accumulatedDelta.current = 0;

      // 커서 복원
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  // 터치 드래그 핸들러 (무한 스크롤)
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
    const itemHeight = 36;

    // 현재 프레임의 델타 계산
    const currentDelta = lastY.current - e.touches[0].clientY;

    // 델타를 누적에 추가
    accumulatedDelta.current += currentDelta;

    // 다음 프레임을 위해 현재 위치 저장
    lastY.current = e.touches[0].clientY;

    // 스크롤 업데이트 (누적 델타 기반)
    let newScroll = dragStartScroll.current + accumulatedDelta.current;
    const singleCycleScroll = maxValue * itemHeight;
    const totalScroll = singleCycleScroll * 3; // 3번 반복

    // 순환 처리 - 첫 번째 세트나 마지막 세트에 가까우면 중간으로 리셋
    if (newScroll < singleCycleScroll * 0.5) {
      // 첫 번째 세트 중반 이전이면 중간 세트로 점프
      newScroll += singleCycleScroll;
      dragStartScroll.current += singleCycleScroll;
      accumulatedDelta.current = newScroll - dragStartScroll.current;
    } else if (newScroll > singleCycleScroll * 2.5) {
      // 세 번째 세트 중반 이후면 중간 세트로 점프
      newScroll -= singleCycleScroll;
      dragStartScroll.current -= singleCycleScroll;
      accumulatedDelta.current = newScroll - dragStartScroll.current;
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

  // 연속적으로 보이도록 3번 반복
  const hours = Array.from({ length: 24 * 3 }, (_, i) => String(i % 24).padStart(2, '0'));
  const minutes = Array.from({ length: 60 * 3 }, (_, i) => String(i % 60).padStart(2, '0'));

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      return;
    }
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
              if (val === '') {
                setHour('00');
                if (hourRef.current) hourRef.current.scrollTop = 24 * 36;
              } else {
                const num = parseInt(val);
                const formatted = String(num).padStart(2, '0');
                setHour(formatted);
                if (hourRef.current) {
                  hourRef.current.scrollTop = (24 + num) * 36;
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
              if (val === '') {
                setMinute('00');
                if (minuteRef.current) minuteRef.current.scrollTop = 60 * 36;
              } else {
                const num = parseInt(val);
                const formatted = String(num).padStart(2, '0');
                setMinute(formatted);
                if (minuteRef.current) {
                  minuteRef.current.scrollTop = (60 + num) * 36;
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
