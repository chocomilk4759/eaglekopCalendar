'use client';

import { useEffect, useRef, useState } from 'react';

interface TimePickerProps {
  value: string; // HH:mm 형식
  onChange: (time: string) => void;
  disabled?: boolean;
}

export default function TimePicker({ value, onChange, disabled = false }: TimePickerProps) {
  const [hour, setHour] = useState('00');
  const [minute, setMinute] = useState('00');

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  // value를 파싱하여 hour, minute 초기화
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setHour(h?.padStart(2, '0') || '00');
      setMinute(m?.padStart(2, '0') || '00');
    } else {
      setHour('00');
      setMinute('00');
    }
  }, [value]);

  // hour나 minute가 바뀌면 onChange 호출
  useEffect(() => {
    onChange(`${hour}:${minute}`);
  }, [hour, minute]);

  // 스크롤 위치로 시간 계산
  const handleHourScroll = () => {
    if (!hourRef.current) return;
    const scrollTop = hourRef.current.scrollTop;
    const itemHeight = 40; // 각 항목 높이
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

  // 초기 스크롤 위치 설정
  useEffect(() => {
    if (hourRef.current && hour) {
      const itemHeight = 40;
      const targetScroll = parseInt(hour) * itemHeight;
      hourRef.current.scrollTop = targetScroll;
    }
  }, []);

  useEffect(() => {
    if (minuteRef.current && minute) {
      const itemHeight = 40;
      const targetScroll = parseInt(minute) * itemHeight;
      minuteRef.current.scrollTop = targetScroll;
    }
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div className="time-picker" style={{
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      opacity: disabled ? 0.5 : 1,
      pointerEvents: disabled ? 'none' : 'auto'
    }}>
      <div
        ref={hourRef}
        className="time-picker-column"
        onScroll={handleHourScroll}
        style={{
          height: 120,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          border: '1px solid var(--border)',
          borderRadius: 8,
          width: 60,
          position: 'relative',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {/* 위 여백 */}
        <div style={{ height: 40 }} />
        {hours.map((h) => (
          <div
            key={h}
            className="time-picker-item"
            style={{
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'start',
              fontSize: 16,
              fontWeight: h === hour ? 600 : 400,
              color: h === hour ? 'var(--text)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
            onClick={() => {
              setHour(h);
              if (hourRef.current) {
                const itemHeight = 40;
                hourRef.current.scrollTo({ top: parseInt(h) * itemHeight, behavior: 'smooth' });
              }
            }}
          >
            {h}
          </div>
        ))}
        {/* 아래 여백 */}
        <div style={{ height: 40 }} />
      </div>

      <span style={{ fontSize: 18, fontWeight: 600 }}>:</span>

      <div
        ref={minuteRef}
        className="time-picker-column"
        onScroll={handleMinuteScroll}
        style={{
          height: 120,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          border: '1px solid var(--border)',
          borderRadius: 8,
          width: 60,
          position: 'relative',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {/* 위 여백 */}
        <div style={{ height: 40 }} />
        {minutes.map((m) => (
          <div
            key={m}
            className="time-picker-item"
            style={{
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'start',
              fontSize: 16,
              fontWeight: m === minute ? 600 : 400,
              color: m === minute ? 'var(--text)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
            onClick={() => {
              setMinute(m);
              if (minuteRef.current) {
                const itemHeight = 40;
                minuteRef.current.scrollTo({ top: parseInt(m) * itemHeight, behavior: 'smooth' });
              }
            }}
          >
            {m}
          </div>
        ))}
        {/* 아래 여백 */}
        <div style={{ height: 40 }} />
      </div>

      {/* 중앙 선택 표시 */}
      <style jsx>{`
        .time-picker-column::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
