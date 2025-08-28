// /types/note.ts

export type Item = {
  emoji: string | null;
  label: string;
  text?: string;
  emojiOnly?: boolean; // 텍스트가 비어있으면 아이콘만 표시
};

export type Note = {
  id?: number;
  y: number;
  m: number;
  d: number;
  content: string;
  items: Item[];
  color: 'red' | 'blue' | null; // 기존 플래그 유지
  link: string | null;          // 통일: 필수 + string|null
  image_url: string | null;     // 통일: 필수 + string|null
  title?: string | null;  
};

/**
 * 임의 row/partial 데이터를 안전한 Note로 변환.
 * - 필수 필드 디폴트 채움
 * - undefined를 모두 제거 (null로 강제)
 * - color는 red/blue 외 값이면 null
 */
export function normalizeNote(row: Partial<Note> & Record<string, any>): Note {
  return {
    id: row.id ?? undefined,
    y: row.y ?? 0,
    m: row.m ?? 0,
    d: row.d ?? 1,
    content: row.content ?? '',
    items: (Array.isArray(row.items) ? row.items : []) as Item[],
    color: row.color === 'red' || row.color === 'blue' ? row.color : null,
    link: row.link ?? null,
    image_url: row.image_url ?? null,
    title: row.title ?? null,
  };
}
