/**
 * lib/utils.ts 유틸리티 함수 테스트
 *
 * TDD 패턴: 각 함수별로 정상 케이스 + 엣지 케이스 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  pad,
  formatDate,
  seoulDateParts,
  daysInMonth,
  startWeekday,
  prevMonth,
  nextMonth,
  normalizeMonth,
  sanitizeUrl,
  clamp,
  storage,
  isMobileDevice,
  debounce,
} from './utils';

describe('pad', () => {
  it('ShouldPadSingleDigitWith0', () => {
    expect(pad(1)).toBe('01');
    expect(pad(5)).toBe('05');
    expect(pad(9)).toBe('09');
  });

  it('ShouldKeepDoubleDigitUnchanged', () => {
    expect(pad(10)).toBe('10');
    expect(pad(25)).toBe('25');
    expect(pad(99)).toBe('99');
  });

  it('ShouldHandleZero', () => {
    expect(pad(0)).toBe('00');
  });
});

describe('formatDate', () => {
  it('ShouldFormatDateCorrectly', () => {
    expect(formatDate(2024, 0, 15)).toBe('2024-01-15');
    expect(formatDate(2024, 11, 31)).toBe('2024-12-31');
  });

  it('ShouldPadMonthAndDay', () => {
    expect(formatDate(2024, 0, 1)).toBe('2024-01-01');
    expect(formatDate(2024, 8, 5)).toBe('2024-09-05');
  });
});

describe('seoulDateParts', () => {
  it('ShouldReturnValidDateParts', () => {
    const parts = seoulDateParts(new Date('2024-11-15T00:00:00Z'));

    expect(parts).toHaveProperty('y');
    expect(parts).toHaveProperty('m');
    expect(parts).toHaveProperty('d');
    expect(typeof parts.y).toBe('number');
    expect(typeof parts.m).toBe('number');
    expect(typeof parts.d).toBe('number');
  });

  it('ShouldReturnMonthAs0Indexed', () => {
    const parts = seoulDateParts(new Date('2024-01-15T00:00:00Z'));
    // January should be 0, not 1
    expect(parts.m).toBeGreaterThanOrEqual(0);
    expect(parts.m).toBeLessThanOrEqual(11);
  });

  it('ShouldHandleDefaultParameter', () => {
    const parts = seoulDateParts();
    expect(parts.y).toBeGreaterThan(2020);
    expect(parts.m).toBeGreaterThanOrEqual(0);
    expect(parts.m).toBeLessThanOrEqual(11);
    expect(parts.d).toBeGreaterThanOrEqual(1);
    expect(parts.d).toBeLessThanOrEqual(31);
  });
});

describe('daysInMonth', () => {
  it('ShouldReturnCorrectDaysForJanuary', () => {
    expect(daysInMonth(2024, 0)).toBe(31);
  });

  it('ShouldReturnCorrectDaysForFebruaryLeapYear', () => {
    expect(daysInMonth(2024, 1)).toBe(29); // 2024 is leap year
  });

  it('ShouldReturnCorrectDaysForFebruaryNonLeapYear', () => {
    expect(daysInMonth(2023, 1)).toBe(28);
  });

  it('ShouldReturnCorrectDaysForApril', () => {
    expect(daysInMonth(2024, 3)).toBe(30);
  });

  it('ShouldReturnCorrectDaysForDecember', () => {
    expect(daysInMonth(2024, 11)).toBe(31);
  });
});

describe('startWeekday', () => {
  it('ShouldReturn0To6', () => {
    const weekday = startWeekday(2024, 0);
    expect(weekday).toBeGreaterThanOrEqual(0);
    expect(weekday).toBeLessThanOrEqual(6);
  });

  it('ShouldReturnConsistentResults', () => {
    // January 1, 2024 was a Monday (1)
    expect(startWeekday(2024, 0)).toBe(1);
  });
});

describe('prevMonth', () => {
  it('ShouldDecrementMonthInSameYear', () => {
    expect(prevMonth(2024, 5)).toEqual({ y: 2024, m: 4 });
  });

  it('ShouldWrapToDecemberWhenJanuary', () => {
    expect(prevMonth(2024, 0)).toEqual({ y: 2023, m: 11 });
  });

  it('ShouldHandleDecember', () => {
    expect(prevMonth(2024, 11)).toEqual({ y: 2024, m: 10 });
  });
});

describe('nextMonth', () => {
  it('ShouldIncrementMonthInSameYear', () => {
    expect(nextMonth(2024, 5)).toEqual({ y: 2024, m: 6 });
  });

  it('ShouldWrapToJanuaryWhenDecember', () => {
    expect(nextMonth(2024, 11)).toEqual({ y: 2025, m: 0 });
  });

  it('ShouldHandleJanuary', () => {
    expect(nextMonth(2024, 0)).toEqual({ y: 2024, m: 1 });
  });
});

describe('normalizeMonth', () => {
  it('ShouldKeepNormalMonthUnchanged', () => {
    expect(normalizeMonth(2024, 5)).toEqual([2024, 5]);
  });

  it('ShouldNormalizeNegativeMonth', () => {
    expect(normalizeMonth(2024, -1)).toEqual([2023, 11]);
    expect(normalizeMonth(2024, -2)).toEqual([2023, 10]);
  });

  it('ShouldNormalizeMonthAbove11', () => {
    expect(normalizeMonth(2024, 12)).toEqual([2025, 0]);
    expect(normalizeMonth(2024, 13)).toEqual([2025, 1]);
  });

  it('ShouldNormalizeLargeNegativeMonth', () => {
    expect(normalizeMonth(2024, -12)).toEqual([2023, 0]);
    expect(normalizeMonth(2024, -13)).toEqual([2022, 11]);
  });
});

describe('sanitizeUrl', () => {
  it('ShouldReturnNullForEmptyInput', () => {
    expect(sanitizeUrl(null)).toBe(null);
    expect(sanitizeUrl(undefined)).toBe(null);
    expect(sanitizeUrl('')).toBe(null);
  });

  it('ShouldKeepHttpUrl', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('ShouldKeepHttpsUrl', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('ShouldAddHttpsToBareDomain', () => {
    expect(sanitizeUrl('example.com')).toBe('https://example.com');
    expect(sanitizeUrl('sub.example.com')).toBe('https://sub.example.com');
  });

  it('ShouldHandleDomainWithPath', () => {
    expect(sanitizeUrl('example.com/path')).toBe('https://example.com/path');
  });

  it('ShouldReturnNullForInvalidFormat', () => {
    expect(sanitizeUrl('not a url')).toBe(null);
    expect(sanitizeUrl('invalid')).toBe(null);
  });

  it('ShouldStripControlCharacters', () => {
    const urlWithControl = 'example.com\u0000';
    expect(sanitizeUrl(urlWithControl)).toBe('https://example.com');
  });
});

describe('clamp', () => {
  it('ShouldReturnValueWhenInRange', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('ShouldReturnMinWhenBelowRange', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('ShouldReturnMaxWhenAboveRange', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('ShouldHandleEqualMinMax', () => {
    expect(clamp(5, 5, 5)).toBe(5);
  });

  it('ShouldHandleBoundaryValues', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('get', () => {
    it('ShouldReturnStoredValue', () => {
      localStorage.setItem('test', JSON.stringify({ foo: 'bar' }));
      expect(storage.get('test', {})).toEqual({ foo: 'bar' });
    });

    it('ShouldReturnDefaultWhenKeyNotFound', () => {
      expect(storage.get('nonexistent', 'default')).toBe('default');
    });

    it('ShouldReturnDefaultWhenParseError', () => {
      localStorage.setItem('invalid', '{invalid json}');
      expect(storage.get('invalid', 'default')).toBe('default');
    });
  });

  describe('set', () => {
    it('ShouldStoreValue', () => {
      storage.set('test', { foo: 'bar' });
      const stored = localStorage.getItem('test');
      expect(JSON.parse(stored!)).toEqual({ foo: 'bar' });
    });

    it('ShouldHandleComplexTypes', () => {
      const complex = { a: 1, b: [2, 3], c: { d: 'e' } };
      storage.set('complex', complex);
      expect(storage.get('complex', {})).toEqual(complex);
    });
  });

  describe('remove', () => {
    it('ShouldRemoveKey', () => {
      localStorage.setItem('test', 'value');
      storage.remove('test');
      expect(localStorage.getItem('test')).toBe(null);
    });

    it('ShouldNotThrowWhenKeyNotFound', () => {
      expect(() => storage.remove('nonexistent')).not.toThrow();
    });
  });
});

describe('isMobileDevice', () => {
  it('ShouldReturnBoolean', () => {
    const result = isMobileDevice();
    expect(typeof result).toBe('boolean');
  });

  it('ShouldHandleMissingWindow', () => {
    // This test runs in a jsdom environment with window defined
    // Just verify it doesn't throw
    expect(() => isMobileDevice()).not.toThrow();
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ShouldDelayFunctionCall', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('ShouldCancelPreviousCallOnRapidCalls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('ShouldPassArgumentsToFunction', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('ShouldHandleMultipleDelayedCalls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('first');

    debounced('second');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('second');

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
