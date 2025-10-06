/**
 * 데이터베이스 타입 정의
 * Supabase 테이블 스키마에 대응
 */

// Preset 테이블
export interface Preset {
  id: number;
  emoji: string | null;
  label: string;
  sort_order: number;
  updated_at?: string;
  updated_by?: string | null;
}

// SearchMapping 테이블
export interface SearchMapping {
  id: number;
  keyword: string;
  target: string;
  mapping_type: 'text' | 'emoji';
  enabled: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// Note 색상 플래그
export type NoteColor = 'red' | 'blue' | null;

// Note 테이블 (완전한 타입)
export interface NoteRow {
  id?: number;
  y: number;
  m: number;
  d: number;
  content: string;
  items: NoteItem[];
  color: NoteColor;
  link: string | null;
  image_url: string | null;
  title: string | null;
  use_image_as_bg: boolean;
  updated_at?: string;
  updated_by?: string | null;
}

// Note 아이템 (칩)
export interface NoteItem {
  emoji: string | null;
  label: string;
  text?: string;
  emojiOnly?: boolean;
  startTime?: string; // HH:mm 형식 (예: "14:30")
  nextDay?: boolean; // 다음날 새벽 시간인 경우 true
}

// Supabase 응답 타입
export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details?: string;
  } | null;
}
