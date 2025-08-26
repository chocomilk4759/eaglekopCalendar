'use client';

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
  size = 40,           // ✅ 기본 높이 축소(기존 56 → 40)
}: {
  buttons: RibbonButton[];
  extraText?: React.ReactNode;
  size?: number;       // ✅ 이미지 버튼 높이(px)
}) {
  return (
    <div className="top-ribbon" style={{ padding: 8 }}>
      {extraText && <div className="ribbon-text">{extraText}</div>}
      <div className="top-ribbon-buttons" style={{ gap: 8 }}>
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
            style={{ border: 'none', background: 'transparent', padding: 0 }}
          >
            <img
              src={b.src}
              alt={b.alt || ''}
              style={{ display: 'block', height: size, width: 'auto', borderRadius: 12 }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
