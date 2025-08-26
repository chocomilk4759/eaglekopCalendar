'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

type RibbonButton = {
  id: string;
  src: string;          // /public 기준 경로
  alt?: string;
  href?: string;        // 클릭 시 열 링크(새 탭)
  onClick?: () => void; // 필요 시 직접 핸들러
};

export default function TopRibbon({
  buttons,
  extraText,
  containerHeight = 48, // 컨테이너 높이(px)
  gap = 10,             // 버튼 사이 간격(px)
  minSize = 24,         // 자동 축소 시 최소 버튼 크기(px)
}: {
  buttons: RibbonButton[];
  extraText?: React.ReactNode;
  containerHeight?: number;
  gap?: number;
  minSize?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRowRef = useRef<HTMLDivElement>(null);

  // 실제 버튼의 한 변(정사각형) 크기
  const [btnSize, setBtnSize] = useState<number>(containerHeight);

  // 컨테이너 padding과 내부 계산용 여백
  const padH = 12;  // 좌우 padding
  const padV = 8;   // 상하 padding

  const innerTargetHeight = useMemo(
    () => Math.max(minSize, containerHeight - padV * 2),
    [containerHeight, minSize]
  );

  function recompute() {
    const wrap = wrapRef.current;
    const row = btnRowRef.current;
    if (!wrap || !row) return;

    const n = buttons.length;
    const innerW = wrap.clientWidth - padH * 2;
    // 버튼이 정사각형이라고 가정하고, 총 가용폭에서 간격을 뺀 뒤 n으로 나눔
    const maxByWidth = Math.floor((innerW - gap * Math.max(0, n - 1)) / Math.max(1, n));

    // 컨테이너 높이에 맞춰지되, 폭을 넘기지 않도록 자동 축소
    const size = Math.max(minSize, Math.min(innerTargetHeight, maxByWidth));
    setBtnSize(size);
  }

  useEffect(() => {
    recompute();
    // 반응형: ResizeObserver 우선, 없으면 window resize
    const wrap = wrapRef.current;
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && wrap) {
      ro = new ResizeObserver(recompute);
      ro.observe(wrap);
    } else {
      const onResize = () => recompute();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    return () => ro?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buttons.length, containerHeight, gap, minSize]);

  return (
    <div
      ref={wrapRef}
      className="top-ribbon"
      style={{
        // 배경/테마는 globals.css의 .top-ribbon 규칙을 사용
        height: containerHeight,
        padding: `${padV}px ${padH}px`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        overflow: 'hidden',
      }}
    >
      {extraText && (
        <div className="ribbon-text" style={{ whiteSpace: 'nowrap' }}>
          {extraText}
        </div>
      )}

      <div
        ref={btnRowRef}
        className="top-ribbon-buttons"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap,
          flex: 1,
          justifyContent: 'flex-start',
          overflow: 'hidden',
        }}
      >
        {buttons.map((b) => (
          <button
            key={b.id}
            className="top-btn"
            title={b.alt}
            aria-label={b.alt}
            onClick={() => {
              if (b.onClick) b.onClick();
              else if (b.href) window.open(b.href, '_blank', 'noopener,noreferrer');
            }}
            style={{
              // 버튼도 정사각형: 높이=컨테이너 높이(자동 축소 반영)
              width: btnSize,
              height: btnSize,
              border: 'none',
              background: 'transparent',
              padding: 0,
              borderRadius: 12,
              flex: '0 0 auto',
            }}
          >
            <img
              src={b.src}
              alt={b.alt || ''}
              // 이미지도 정사각형 영역에 딱 맞춘다 (기존 CSS의 height:56px을 무시)
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 12,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
