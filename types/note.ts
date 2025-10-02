// /types/note.ts

import type { NoteRow, NoteItem, NoteColor } from './database';

// 레거시 호환성을 위한 타입 별칭
export type Item = NoteItem;
export type Note = NoteRow;

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
    use_image_as_bg: row.use_image_as_bg ?? false,
  };
}