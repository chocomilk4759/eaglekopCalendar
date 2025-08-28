// app/types/note.ts
export type Item = {
  emoji: string | null;     // 이모지(또는 null)
  label: string;            // 프리셋 라벨(아이콘명)
  text?: string;            // 사용자 편집 텍스트(없으면 emojiOnly=true)
  emojiOnly?: boolean;      // 텍스트가 없으면 true
};

export type Note = {
  id?: number;
  y: number;
  m: number;
  d: number;
  content: string;                     // 메모
  items: Item[];
  color: 'red' | 'blue' | null;        // 배경 플래그
  link?: string | null;                // 외부 링크
  image_url?: string | null;           // 스토리지 경로 또는 URL
  title?: string | null;               // ⬅️ 셀 상단 중앙 타이틀 (NEW)
};

// DB·네트워크 넘기기 전에 안전한 형태로 정규화
export function normalizeNote(n: any): Note {
  // 필수 정수 필드
  const y = Number(n?.y ?? 0);
  const m = Number(n?.m ?? 0);
  const d = Number(n?.d ?? 0);

  // items 정규화
  const rawItems = Array.isArray(n?.items) ? n.items : [];
  const items: Item[] = rawItems.map((it: any) => ({
    emoji: it?.emoji ?? null,
    label: String(it?.label ?? ''),
    text: (typeof it?.text === 'string' && it.text.length ? it.text : undefined),
    emojiOnly: !!it?.emojiOnly || !(typeof it?.text === 'string' && it.text.length),
  }));

  // color 정규화
  const color = (n?.color === 'red' || n?.color === 'blue') ? n.color : null;

  // link / image_url / title 정규화
  const link = (typeof n?.link === 'string' && n.link.trim().length) ? n.link.trim() : null;
  const image_url = (typeof n?.image_url === 'string' && n.image_url.trim().length) ? n.image_url.trim() : null;
  const title = (typeof n?.title === 'string' && n.title.trim().length) ? n.title.trim() : null;

  return {
    id: (typeof n?.id === 'number') ? n.id : undefined,
    y, m, d,
    content: (typeof n?.content === 'string') ? n.content : '',
    items,
    color,
    link,
    image_url,
    title,   // ⬅️ 유지
  };
}
