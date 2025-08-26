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
  // 첫 번째 버튼의 ref로 부모 박스를 관찰(컨테이너 없이 크기 계산)
  const firstBtnRef = useRef<HTMLButtonElement | null>(null);
  const [btnSize, setBtnSize] = useState<number>(containerHeight ?? 64);

  // 버튼 개수·간격 기반 가용폭 내 사이즈 계산
  const computeSize = () => {
    const first = firstBtnRef.current;
    if (!first) return;

    const parent = first.parentElement; // TopRibbon 상위 컨테이너(예: flex 박스)
    if (!parent) return;

    const n = Math.max(1, buttons.length);
    const parentW = parent.clientWidth;   // 사용 가능한 가로폭
    const parentH = parent.clientHeight;  // 사용 가능한 세로높이(없으면 0)

    // 목표 높이: 우선 순위 (prop 지정 높이) > (부모 높이) > fallback 48
    const targetH = Math.max(minSize, (containerHeight ?? parentH || 64));

    // 폭 기준 한 버튼 최대 크기(정사각형 가정)
    const maxByWidth = Math.floor((parentW - gap * (n - 1)) / n);

    // 최종 버튼 변 길이
    const size = Math.max(minSize, Math.min(targetH, maxByWidth));
    setBtnSize(size);
  };

  useEffect(() => {
    computeSize();

    // 부모 크기 변화 관찰
    const first = firstBtnRef.current;
    const parent = first?.parentElement || null;

    let ro: ResizeObserver | null = null;
    if (parent && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(computeSize);
      ro.observe(parent);
    } else {
      const onResize = () => computeSize();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    return () => ro?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buttons.length, containerHeight, gap, minSize]);

  return (
    <>
      {/* 선택적 텍스트(별도 컨테이너 없이 바로 노출) */}
      {extraText && (
        <span style={{ whiteSpace: 'nowrap', marginRight: gap }}>{extraText}</span>
      )}

      {/* 버튼들만 직접 렌더 (컨테이너 없음) */}
      {buttons.map((b, i) => (
        <button
          key={b.id}
          ref={i === 0 ? firstBtnRef : undefined}
          title={b.alt}
          aria-label={b.alt}
          onClick={() => {
            if (b.onClick) b.onClick();
            else if (b.href) window.open(b.href, '_blank', 'noopener,noreferrer');
          }}
          style={{
            // 정사각형 버튼
            width: btnSize,
            height: btnSize,
            border: 'none',
            background: 'transparent',
            padding: 0,
            borderRadius: 12,
            // 행 내 간격 (부모가 flex든 inline 흐름이든 동작)
            marginRight: i < buttons.length - 1 ? gap : 0,
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
    </>
  );
}
