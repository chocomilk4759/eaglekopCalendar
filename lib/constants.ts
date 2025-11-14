/**
 * 애플리케이션 전역 상수 정의
 */

// ── Storage 관련 ──────────────────────────────────────────────────────
export const STORAGE = {
  /** Supabase Storage 버킷 이름 */
  BUCKET: 'note-images',
  /** 일반 이미지 최대 크기 (MB) */
  MAX_IMAGE_MB: 5,
  /** GIF 이미지 최대 크기 (MB) */
  MAX_GIF_MB: 10,
  /** WebP 변환 품질 (0-1) */
  WEBP_QUALITY: 0.82,
  /** Preview 이미지 품질 (0-1) */
  PREVIEW_QUALITY: 0.72,
  /** Preview 이미지 최대 너비 (px) */
  PREVIEW_MAX_WIDTH: 640,
  /** 원본 이미지 최대 너비 (px) */
  ORIGINAL_MAX_WIDTH: 1600,
} as const;

// ── Timing 관련 ───────────────────────────────────────────────────────
export const TIMING = {
  /** Longpress 임계값 - 모바일 (ms) */
  LONGPRESS_MOBILE: 200,
  /** Longpress 임계값 - 데스크톱 (ms) */
  LONGPRESS_DESKTOP: 350,
  /** 캐시 TTL - 이미지 URL (초) */
  CACHE_TTL: 3600,
  /** 캐시 TTL - 공휴일 데이터 (초, 24시간) */
  HOLIDAY_CACHE_TTL: 86400,
  /** Drag pulse 애니메이션 지속 시간 (ms) */
  DRAG_PULSE_DURATION: 200,
} as const;

// ── Cache Version ─────────────────────────────────────────────────────
export const CACHE_VERSION = {
  /** 월별 노트 캐시 버전 (localStorage) */
  MONTH: 'cal-cache-0.16.0',
  /** 이미지 URL 캐시 버전 */
  IMAGE: 'v1',
} as const;

// ── Modal Size ────────────────────────────────────────────────────────
export const MODAL_SIZE = {
  /** DateInfoModal 기본 높이 - 이미지 없음 (px) */
  DATE_INFO_BASE_HEIGHT: 268,
  /** DateInfoModal 기본 높이 - 이미지 있음 (px) */
  DATE_INFO_WITH_IMAGE_HEIGHT: 330,
  /** DateInfoModal 모바일 추가 높이 (px) */
  DATE_INFO_MOBILE_EXTRA: 20,
  /** DateInfoModal 칩당 추가 높이 (px) */
  DATE_INFO_CHIP_HEIGHT: 20,
  /** DateInfoModal 최소 높이 (px) */
  DATE_INFO_MIN_HEIGHT: 268,
  /** DateInfoModal 최대 높이 (px) */
  DATE_INFO_MAX_HEIGHT: 900,
} as const;

// ── Responsive Breakpoint ─────────────────────────────────────────────
export const BREAKPOINT = {
  /** 모바일/데스크톱 구분 (px) */
  MOBILE: 768,
  /** PresetsDock 숨김 임계값 (px) */
  PRESETS_DOCK_HIDE: 1200,
} as const;

// ── 허용된 이미지 타입 ────────────────────────────────────────────────
export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/apng',
  'image/avif',
] as const;

// ── 애니메이션 포맷 (압축 안함) ────────────────────────────────────────
export const ANIMATED_IMAGE_TYPES = [
  'image/gif',
  'image/apng',
] as const;

// ── 키보드 단축키 ─────────────────────────────────────────────────────
export const KEYBOARD_SHORTCUTS = {
  /** 검색 모달 열기 */
  SEARCH: 'KeyF',
  /** 단축키 가이드 (향후 구현) */
  HELP: 'Slash',
} as const;
