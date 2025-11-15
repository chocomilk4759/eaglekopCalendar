/**
 * XSS Protection Test Suite
 *
 * TDD Red-Green-Refactor 사이클:
 * 🔴 Red: 테스트 작성 (이 파일)
 * 🟢 Green: lib/sanitize.ts 구현 (이미 완료)
 * ♻️ Refactor: 필요 시 개선
 */

import { describe, test, expect } from 'vitest';
import { sanitizeText, sanitizeHtml, sanitizeUrl, sanitizeNote } from './sanitize';

describe('sanitizeText', () => {
  describe('XSS Attack Vectors', () => {
    test('should remove script tags', () => {
      const malicious = '<script>alert("XSS")</script>Hello';
      const result = sanitizeText(malicious);
      expect(result).toBe('Hello');
      expect(result).not.toContain('<script');
    });

    test('should remove img with onerror', () => {
      const malicious = '<img src=x onerror=alert(1)>Text';
      const result = sanitizeText(malicious);
      expect(result).toBe('Text');
      expect(result).not.toContain('onerror');
    });

    test('should remove iframe tags completely (no content preserved)', () => {
      // DOMPurify는 보안상 iframe 내부 콘텐츠도 완전히 제거
      const malicious = '<iframe src="javascript:alert(1)">Content</iframe>';
      const result = sanitizeText(malicious);
      expect(result).toBe('');
      expect(result).not.toContain('<iframe');
    });

    test('should remove svg with onload completely (no content preserved)', () => {
      // DOMPurify는 보안상 svg 내부 콘텐츠도 완전히 제거
      const malicious = '<svg onload=alert(1)>Text</svg>';
      const result = sanitizeText(malicious);
      expect(result).toBe('');
      expect(result).not.toContain('onload');
    });

    test('should remove event handlers', () => {
      const malicious = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeText(malicious);
      expect(result).toBe('Click me');
      expect(result).not.toContain('onclick');
    });
  });

  describe('HTML Tag Removal', () => {
    test('should remove all HTML tags', () => {
      const input = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
      const result = sanitizeText(input);
      expect(result).toBe('Bold and italic text');
    });

    test('should remove nested tags', () => {
      const input = '<div><span><b>Nested</b></span></div>';
      const result = sanitizeText(input);
      expect(result).toBe('Nested');
    });

    test('should preserve line breaks as text', () => {
      const input = 'Line 1<br>Line 2';
      const result = sanitizeText(input);
      expect(result).toBe('Line 1Line 2');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string', () => {
      expect(sanitizeText('')).toBe('');
    });

    test('should handle null', () => {
      expect(sanitizeText(null)).toBe('');
    });

    test('should handle undefined', () => {
      expect(sanitizeText(undefined)).toBe('');
    });

    test('should handle plain text', () => {
      expect(sanitizeText('Hello World')).toBe('Hello World');
    });

    test('should preserve emojis', () => {
      expect(sanitizeText('Hello 👋 World 🌍')).toBe('Hello 👋 World 🌍');
    });

    test('should preserve Korean text', () => {
      expect(sanitizeText('안녕하세요')).toBe('안녕하세요');
    });

    test('should handle whitespace', () => {
      expect(sanitizeText('   spaces   ')).toBe('   spaces   ');
    });
  });
});

describe('sanitizeUrl', () => {
  describe('Dangerous Protocols', () => {
    test('should block javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe(null);
    });

    test('should block javascript: with uppercase', () => {
      expect(sanitizeUrl('JavaScript:alert(1)')).toBe(null);
    });

    test('should block data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe(null);
    });

    test('should block vbscript: protocol', () => {
      expect(sanitizeUrl('vbscript:msgbox("XSS")')).toBe(null);
    });
  });

  describe('Safe URLs', () => {
    test('should allow https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    test('should allow http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    test('should add https to URLs without protocol', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com');
    });

    test('should allow relative paths', () => {
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
    });

    test('should allow anchor links', () => {
      expect(sanitizeUrl('#section')).toBe('#section');
    });

    test('should preserve query parameters', () => {
      expect(sanitizeUrl('https://example.com?foo=bar')).toBe('https://example.com?foo=bar');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string', () => {
      expect(sanitizeUrl('')).toBe(null);
    });

    test('should handle null', () => {
      expect(sanitizeUrl(null)).toBe(null);
    });

    test('should handle undefined', () => {
      expect(sanitizeUrl(undefined)).toBe(null);
    });

    test('should trim whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });

    test('should handle non-string input', () => {
      expect(sanitizeUrl(123 as unknown as string)).toBe(null);
    });
  });
});

describe('sanitizeHtml', () => {
  describe('Allowed Tags', () => {
    test('should preserve safe HTML tags', () => {
      const input = '<p><strong>Bold</strong> and <em>italic</em></p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    test('should preserve links', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<a');
      expect(result).toContain('href');
    });

    test('should preserve lists', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });
  });

  describe('Dangerous Content Removal', () => {
    test('should remove script tags', () => {
      const input = '<p>Safe</p><script>alert(1)</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script');
      expect(result).toContain('<p>');
    });

    test('should remove event handlers from allowed tags', () => {
      const input = '<p onclick="alert(1)">Click</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('<p>');
    });
  });
});

describe('sanitizeNote', () => {
  test('should sanitize all text fields in Note object', () => {
    const maliciousNote = {
      content: '<script>alert("XSS")</script>Safe content',
      title: '<img src=x onerror=alert(1)>Title',
      link: 'https://example.com',
      items: [
        { text: '<script>Bad</script>Good', emoji: '🔥' },
        { text: 'Clean text', emoji: '✅' },
      ],
    };

    const cleaned = sanitizeNote(maliciousNote);

    expect(cleaned.content).toBe('Safe content');
    expect(cleaned.title).toBe('Title');
    expect(cleaned.link).toBe('https://example.com');
    expect(cleaned.items?.[0]?.text).toBe('Good');
    expect(cleaned.items?.[0]?.emoji).toBe('🔥');
    expect(cleaned.items?.[1]?.text).toBe('Clean text');
  });

  test('should block malicious URLs in link field', () => {
    const maliciousNote = {
      content: 'Content',
      link: 'javascript:alert(1)',
    };

    const cleaned = sanitizeNote(maliciousNote);
    expect(cleaned.link).toBe(null);
  });

  test('should handle undefined fields', () => {
    const note = {
      content: 'Content',
    };

    const cleaned = sanitizeNote(note);
    expect(cleaned.content).toBe('Content');
    expect(cleaned.title).toBeUndefined();
    expect(cleaned.link).toBeUndefined();
  });

  test('should sanitize emoji field (防 XSS in emoji)', () => {
    const note = {
      items: [{ emoji: '<script>alert(1)</script>🔥', text: 'Text' }],
    };

    const cleaned = sanitizeNote(note);
    expect(cleaned.items?.[0]?.emoji).toBe('🔥');
    expect(cleaned.items?.[0]?.emoji).not.toContain('<script');
  });
});

describe('Real-world XSS Attack Scenarios', () => {
  const XSS_VECTORS = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<iframe src="javascript:alert(1)">',
    '<svg onload=alert(1)>',
    '"><script>alert(1)</script>',
    '<script src="http://evil.com/xss.js"></script>',
    '<body onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '<select onfocus=alert(1) autofocus>',
    '<textarea onfocus=alert(1) autofocus>',
    '<marquee onstart=alert(1)>',
    '<details open ontoggle=alert(1)>',
  ];

  XSS_VECTORS.forEach((vector) => {
    test(`should block XSS vector: ${vector.substring(0, 30)}...`, () => {
      const result = sanitizeText(vector);

      // 결과에 위험한 패턴이 없어야 함
      expect(result).not.toContain('<script');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('onerror=');
      expect(result).not.toContain('onload=');
      expect(result).not.toContain('onfocus=');
      expect(result).not.toContain('onstart=');
      expect(result).not.toContain('ontoggle=');
    });
  });
});
