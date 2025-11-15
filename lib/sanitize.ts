/**
 * HTML Sanitization Utility
 *
 * XSS 공격 방지를 위한 HTML sanitization 유틸리티.
 * isomorphic-dompurify를 사용하여 클라이언트/서버 양쪽에서 동작.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * 사용자 입력 HTML을 sanitize하여 XSS 공격 방지
 *
 * @param dirty - Sanitize할 HTML 문자열
 * @returns Sanitize된 안전한 HTML 문자열
 *
 * @example
 * ```typescript
 * const userInput = '<script>alert("XSS")</script><p>Safe content</p>';
 * const clean = sanitizeHtml(userInput);
 * // Result: '<p>Safe content</p>'
 * ```
 */
export function sanitizeHtml(
  dirty: string | null | undefined
): string {
  if (!dirty) return '';

  // 기본 설정: 안전한 HTML 태그만 허용
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 's', 'strike',
      'p', 'br', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'img',
      'blockquote', 'code', 'pre',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height',
      'class', 'style',
    ],
    ALLOW_DATA_ATTR: false,
  }) as string;
}

/**
 * 텍스트 전용 sanitization (HTML 태그 모두 제거)
 *
 * @param dirty - Sanitize할 문자열
 * @returns HTML 태그가 제거된 순수 텍스트
 *
 * @example
 * ```typescript
 * const userInput = '<script>alert("XSS")</script><p>Safe content</p>';
 * const text = sanitizeText(userInput);
 * // Result: 'Safe content'
 * ```
 */
export function sanitizeText(dirty: string | null | undefined): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * URL sanitization - javascript:, data:, vbscript: 프로토콜 차단
 *
 * @param url - Sanitize할 URL
 * @returns 안전한 URL 또는 null (악의적 URL인 경우)
 *
 * @example
 * ```typescript
 * sanitizeUrl('https://example.com'); // 'https://example.com'
 * sanitizeUrl('javascript:alert(1)'); // null
 * sanitizeUrl('data:text/html,<script>alert(1)</script>'); // null
 * ```
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // 위험한 프로토콜 차단
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    console.warn(`[sanitizeUrl] Blocked dangerous URL: ${trimmed.substring(0, 50)}...`);
    return null;
  }

  // 상대 경로나 앵커는 허용
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }

  // http(s) 프로토콜만 허용
  if (!/^https?:\/\//i.test(trimmed)) {
    // 프로토콜 없으면 https 자동 추가
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Note 객체의 사용자 입력 필드를 일괄 sanitize
 *
 * @param note - Sanitize할 Note 객체
 * @returns Sanitize된 Note 객체
 */
export function sanitizeNote(note: {
  content?: string | null;
  title?: string | null;
  link?: string | null;
  items?: Array<{ text?: string | null; emoji?: string | null; [key: string]: unknown }>;
  [key: string]: unknown;
}): typeof note {
  return {
    ...note,
    content: note.content ? sanitizeText(note.content) : note.content,
    title: note.title ? sanitizeText(note.title) : note.title,
    link: note.link ? sanitizeUrl(note.link) : note.link,
    items: note.items?.map(item => ({
      ...item,
      text: item.text ? sanitizeText(item.text) : item.text,
      // emoji는 보통 안전하지만 만약의 경우를 대비
      emoji: item.emoji ? sanitizeText(item.emoji) : item.emoji,
    })),
  };
}
