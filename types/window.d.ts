/**
 * Window global type declarations
 *
 * Drag & Drop 페이로드를 위한 전역 window 객체 확장
 * Mobile 환경에서 dataTransfer가 제대로 동작하지 않는 문제 해결용
 */

import type { NoteItem, NoteRow } from './database';

// Drag & Drop 페이로드 타입 정의
export interface DragPayload {
  type: 'chip';
  sourceType: 'modal' | 'cell' | 'unscheduled';
  sourceDate?: { y: number; m: number; d: number };
  chipIndex: number;
  item: NoteItem;
}

// Note copy 페이로드 타입
export interface NoteCopyPayload {
  type: 'note-copy';
  note: Omit<NoteRow, 'id' | 'updated_at' | 'updated_by'>;
}

declare global {
  interface Window {
    /**
     * DateInfoModal에서 Calendar로 드래그할 때 사용
     * Mobile dataTransfer fallback
     */
    __draggedModalChip: DragPayload | null;

    /**
     * UnscheduledModal에서 Calendar로 드래그할 때 사용
     * Mobile dataTransfer fallback
     */
    __draggedUnscheduledChip: DragPayload | null;

    /**
     * Calendar cell에서 UnscheduledModal로 드래그할 때 사용
     * Mobile dataTransfer fallback
     */
    __draggedCellChip: DragPayload | null;
  }
}

export {};
