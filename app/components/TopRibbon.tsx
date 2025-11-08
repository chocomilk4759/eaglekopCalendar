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
  containerHeight, // 선택: 지정 시 버튼 높이를 이 값에 맞춤. 없으면 부모 높이 추정.
  gap = 10,        // 버튼 사이 간격(px)
  minSize = 24,    // 자동 축소 시 최소 버튼 크기(px)
}: {
  buttons: RibbonButton[];
  extraText?: React.ReactNode;
  containerHeight?: number;
  gap?: number;
  minSize?: number;
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [btnSize, setBtnSize] = useState<number>(containerHeight ?? 64);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  // 버튼 크기 계산
  const computeSize = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const parentW = container.clientWidth;
    const targetH = containerHeight ?? 64;

    // 모바일(768px 이하)에서는 최소 48px 보장
    const isMobile = window.innerWidth <= 768;
    const effectiveMinSize = isMobile ? 48 : minSize;

    // 모든 버튼이 한 줄에 들어갈 수 있는지 계산
    const n = Math.max(1, buttons.length);
    const maxByWidth = Math.floor((parentW - gap * (n - 1)) / n);

    // 최종 크기: 높이와 폭 기준 중 작은 값, 단 최소 크기 이상
    const size = Math.max(effectiveMinSize, Math.min(targetH, maxByWidth));
    setBtnSize(size);
  };

  // 스크롤 위치에 따라 좌우 페이드 표시 여부 결정
  const updateScrollFade = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftFade(scrollLeft > 10);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    computeSize();
    updateScrollFade();

    const container = scrollContainerRef.current;
    if (!container) return;

    // ResizeObserver로 컨테이너 크기 변화 감지
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        computeSize();
        updateScrollFade();
      });
      ro.observe(container);
    } else {
      const onResize = () => {
        computeSize();
        updateScrollFade();
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    return () => ro?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buttons.length, containerHeight, gap, minSize]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: containerHeight ?? 64,
      }}
    >
      {/* 좌측 페이드 그라데이션 */}
      {showLeftFade && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 40,
            background: 'linear-gradient(to right, var(--bg), transparent)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* 우측 페이드 그라데이션 */}
      {showRightFade && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 40,
            background: 'linear-gradient(to left, var(--bg), transparent)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* 스크롤 컨테이너 */}
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollFade}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap,
          overflowX: 'auto',
          overflowY: 'hidden',
          height: '100%',
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 8,
        }}
        className="top-ribbon-scroll"
      >
        {/* 선택적 텍스트 */}
        {extraText && (
          <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{extraText}</span>
        )}

        {/* 버튼들 */}
        {buttons.map((b, i) => (
          <button
            key={b.id}
            title={b.alt}
            aria-label={b.alt}
            onClick={() => {
              if (b.onClick) b.onClick();
              else if (b.href) window.open(b.href, '_blank', 'noopener,noreferrer');
            }}
            style={{
              width: btnSize,
              height: btnSize,
              flexShrink: 0,
              border: 'none',
              background: 'transparent',
              padding: 0,
              borderRadius: 12,
            }}
          >
            <img
              src={b.src}
              alt={b.alt || ''}
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 12,
                boxShadow: '0 2px 6px rgba(0,0,0,.08)',
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
