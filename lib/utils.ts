/**
 * 공통 유틸리티 함수
 */

import { safeSetItem } from './localStorageUtils';

// 날짜 포맷팅: 숫자를 2자리 문자열로 (예: 1 -> "01")
export const pad = (n: number): string => String(n).padStart(2, '0');

// 날짜 포맷: YYYY-MM-DD
export const formatDate = (y: number, m: number, d: number): string =>
  `${y}-${pad(m + 1)}-${pad(d)}`;

// 서울 타임존 기준 날짜 파싱
const SEOUL_TZ = 'Asia/Seoul';
export function seoulDateParts(date = new Date()): { y: number; m: number; d: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [y, m, day] = formatter.format(date).split('-').map(Number);
  return { y, m: m - 1, d: day }; // m은 0-indexed (0=1월)
}

// 월 일수 계산
export function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

// 월 시작 요일 (0=일요일)
export function startWeekday(y: number, m: number): number {
  return new Date(y, m, 1).getDay();
}

// 이전 달 계산
export function prevMonth(y: number, m: number): { y: number; m: number } {
  return m > 0 ? { y, m: m - 1 } : { y: y - 1, m: 11 };
}

// 다음 달 계산
export function nextMonth(y: number, m: number): { y: number; m: number } {
  return m < 11 ? { y, m: m + 1 } : { y: y + 1, m: 0 };
}

// 월 정규화 (음수/13 이상 처리)
export function normalizeMonth(y: number, m: number): [number, number] {
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return [yy, mm];
}

// URL 안전화 (외부 링크 검증)
export function sanitizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/[\u0000-\u001F\u007F]/g, '');

  // http(s):// 프로토콜이 있으면 그대로
  if (/^https?:\/\//i.test(cleaned)) return cleaned;

  // 도메인 형식이면 https:// 추가
  if (/^[\w.-]+\.[A-Za-z]{2,}(\/.*)?$/.test(cleaned)) {
    return `https://${cleaned}`;
  }

  return null; // 허용되지 않는 형식
}

// 클램프 (값을 min-max 범위로 제한)
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// localStorage 안전 래퍼
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    const success = safeSetItem(key, JSON.stringify(value));
    if (!success) {
      console.warn(`Failed to save to localStorage: ${key}`);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove from localStorage: ${key}`, error);
    }
  },
};

// 모바일/터치 디바이스 감지
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const isCoarse = window.matchMedia?.('(pointer: coarse)')?.matches;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return isCoarse || isTouchDevice;
}
