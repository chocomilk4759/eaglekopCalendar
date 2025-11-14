// /types/note.ts

import type { NoteRow, NoteItem, NoteColor } from './database';

// 레거시 호환성을 위한 타입 별칭
export type Item = NoteItem;
export type Note = NoteRow;

// ────────────────────────────────────────────────────────────────
// startTime 유효성 검증 유틸리티
// ────────────────────────────────────────────────────────────────

/**
 * HH:mm 형식 검증 정규식 (00:00 ~ 23:59)
 */
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * startTime 문자열이 HH:mm 형식인지 검증
 * @param time - 검증할 시간 문자열
 * @returns HH:mm 형식이면 true
 * @example
 * isValidStartTime('14:30') // true
 * isValidStartTime('25:00') // false
 * isValidStartTime('9:30')  // false (0을 붙여야 함)
 */
export function isValidStartTime(time: string | undefined): boolean {
  if (!time || time === '') return true; // 빈 값은 허용 (선택 필드)
  return TIME_REGEX.test(time);
}

/**
 * startTime 문자열을 안전하게 정규화
 * - 빈 문자열/undefined → undefined 반환
 * - 유효하지 않은 형식 → undefined 반환 (경고 출력)
 * - 유효한 형식 → 원본 반환
 */
export function normalizeStartTime(time: string | undefined): string | undefined {
  if (!time || time.trim() === '') return undefined;
  const trimmed = time.trim();
  if (!isValidStartTime(trimmed)) {
    console.warn(`[normalizeStartTime] Invalid time format: "${trimmed}". Expected HH:mm (00:00-23:59).`);
    return undefined;
  }
  return trimmed;
}

/**
 * NoteItem의 startTime/nextDay 관련 데이터를 안전하게 설정
 * @param item - 업데이트할 NoteItem
 * @param startTime - 시작 시간 (HH:mm 형식 또는 빈 문자열)
 * @param nextDay - 다음날 플래그
 * @returns 업데이트된 NoteItem
 */
export function setItemTime(
  item: NoteItem,
  startTime: string | undefined,
  nextDay: boolean | undefined
): NoteItem {
  const normalized = normalizeStartTime(startTime);
  return {
    ...item,
    startTime: normalized,
    // nextDay는 startTime이 있을 때만 의미가 있음
    nextDay: normalized ? (nextDay ?? false) : undefined,
  };
}

/**
 * 임의 row/partial 데이터를 안전한 Note로 변환.
 * - 필수 필드 디폴트 채움
 * - undefined를 모두 제거 (null로 강제)
 * - color는 red/blue 외 값이면 null
 */
export function normalizeNote(row: Partial<Note> | (Partial<Note> & Record<string, unknown>)): Note {
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