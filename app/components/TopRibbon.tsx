'use client';

type RibbonButton = {
  id: string;
  src: string;          // /public 경로 기준 이미지 (예: /ribbon/btn1.png)
  alt?: string;
  href?: string;        // 클릭 시 열 링크(없으면 동작 없음)
  onClick?: () => void; // 필요 시 직접 핸들러
};

export default function TopRibbon({
  buttons,
  extraText,
}: {
  buttons: RibbonButton[];
  extraText?: React.ReactNode; // "TODAY : 2025.08.26" 같은 텍스트
}) {
  return (
    <div className="top-ribbon">
      {extraText && <div className="ribbon-text">{extraText}</div>}
      <div className="top-ribbon-buttons">
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
          >
            <img src={b.src} alt={b.alt || ''} />
          </button>
        ))}
      </div>
    </div>
  );
}
