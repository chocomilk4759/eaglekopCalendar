/**
 * lib/holidayApi.ts 테스트
 *
 * TDD 패턴: 공휴일 API 호출, 캐싱, 날짜 확인 로직 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getHolidays, isHoliday, isSunday, HolidayInfo } from './holidayApi';

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorageUtils
vi.mock('./localStorageUtils', () => ({
  safeSetItem: vi.fn((key: string, value: string) => {
    localStorage.setItem(key, value);
  }),
}));

import { safeSetItem } from './localStorageUtils';

describe('holidayApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getHolidays', () => {
    it('ShouldReturnMapFromApiWhenNoCacheExists', async () => {
      const mockHolidays: Array<[string, HolidayInfo]> = [
        ['20240101', { dateName: '신정', date: '2024-01-01' }],
        ['20240209', { dateName: '설날', date: '2024-02-09' }],
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ holidays: mockHolidays }),
      } as Response);

      const result = await getHolidays(2024, 1);

      expect(result.size).toBe(2);
      expect(result.get('20240101')).toEqual({ dateName: '신정', date: '2024-01-01' });
      expect(result.get('20240209')).toEqual({ dateName: '설날', date: '2024-02-09' });
    });

    it('ShouldReturnCachedDataWhenCacheValid', async () => {
      const cachedData = {
        data: [['20240101', { dateName: '신정', date: '2024-01-01' }]],
        exp: Date.now() + 10000, // Future expiration
      };

      localStorage.setItem('holiday-cache:2024-01', JSON.stringify(cachedData));

      const result = await getHolidays(2024, 1);

      expect(result.size).toBe(1);
      expect(result.get('20240101')).toEqual({ dateName: '신정', date: '2024-01-01' });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('ShouldIgnoreExpiredCacheAndFetchFresh', async () => {
      const expiredData = {
        data: [['20240101', { dateName: '신정', date: '2024-01-01' }]],
        exp: Date.now() - 1000, // Past expiration
      };

      const cacheKey = 'holiday-cache:2024-01';
      localStorage.setItem(cacheKey, JSON.stringify(expiredData));

      const mockHolidays: Array<[string, HolidayInfo]> = [
        ['20240209', { dateName: '설날', date: '2024-02-09' }],
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ holidays: mockHolidays }),
      } as Response);

      const result = await getHolidays(2024, 1);

      expect(result.size).toBe(1);
      expect(result.get('20240209')).toEqual({ dateName: '설날', date: '2024-02-09' });
      expect(fetch).toHaveBeenCalled();

      // Expired cache should be removed during check phase
      // But fresh data will be cached again after fetch
      const freshCache = localStorage.getItem(cacheKey);
      expect(freshCache).not.toBe(null);
      if (freshCache) {
        const parsed = JSON.parse(freshCache);
        expect(parsed.data).toEqual(mockHolidays);
        expect(parsed.exp).toBeGreaterThan(Date.now());
      }
    });

    it('ShouldCacheApiResponseToLocalStorage', async () => {
      const mockHolidays: Array<[string, HolidayInfo]> = [
        ['20240101', { dateName: '신정', date: '2024-01-01' }],
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ holidays: mockHolidays }),
      } as Response);

      await getHolidays(2024, 1);

      expect(safeSetItem).toHaveBeenCalled();
      const cacheKey = 'holiday-cache:2024-01';
      const cached = localStorage.getItem(cacheKey);
      expect(cached).not.toBe(null);

      if (cached) {
        const parsed = JSON.parse(cached);
        expect(parsed.data).toEqual(mockHolidays);
        expect(parsed.exp).toBeGreaterThan(Date.now());
      }
    });

    it('ShouldReturnEmptyMapWhenApiFails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await getHolidays(2024, 1);

      expect(result.size).toBe(0);
    });

    it('ShouldReturnEmptyMapWhenApiReturnsError', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'API error' }),
      } as Response);

      const result = await getHolidays(2024, 1);

      expect(result.size).toBe(0);
    });

    it('ShouldReturnEmptyMapWhenFetchThrows', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await getHolidays(2024, 1);

      expect(result.size).toBe(0);
    });

    it('ShouldHandleInvalidCachedData', async () => {
      localStorage.setItem('holiday-cache:2024-01', 'invalid json');

      const mockHolidays: Array<[string, HolidayInfo]> = [
        ['20240101', { dateName: '신정', date: '2024-01-01' }],
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ holidays: mockHolidays }),
      } as Response);

      const result = await getHolidays(2024, 1);

      expect(result.size).toBe(1);
      expect(fetch).toHaveBeenCalled();
    });

    it('ShouldFormatCacheKeyWithPaddedMonth', async () => {
      const mockHolidays: Array<[string, HolidayInfo]> = [
        ['20240301', { dateName: '삼일절', date: '2024-03-01' }],
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ holidays: mockHolidays }),
      } as Response);

      await getHolidays(2024, 3);

      expect(fetch).toHaveBeenCalledWith('/api/holidays?year=2024&month=3');
      const cacheKey = 'holiday-cache:2024-03';
      expect(localStorage.getItem(cacheKey)).not.toBe(null);
    });

    it('ShouldHandleEmptyHolidaysArray', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ holidays: [] }),
      } as Response);

      const result = await getHolidays(2024, 1);

      expect(result.size).toBe(0);
    });

    it('ShouldHandleMissingHolidaysField', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await getHolidays(2024, 1);

      expect(result.size).toBe(0);
    });

    it('ShouldHandleNonArrayHolidaysField', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ holidays: 'not an array' }),
      } as Response);

      const result = await getHolidays(2024, 1);

      expect(result.size).toBe(0);
    });

    it('ShouldNotThrowWhenCacheSaveFails', async () => {
      const mockHolidays: Array<[string, HolidayInfo]> = [
        ['20240101', { dateName: '신정', date: '2024-01-01' }],
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ holidays: mockHolidays }),
      } as Response);

      // Mock safeSetItem to throw
      vi.mocked(safeSetItem).mockImplementation(() => {
        throw new Error('Storage full');
      });

      const result = await getHolidays(2024, 1);

      expect(result.size).toBe(1);
      expect(result.get('20240101')).toEqual({ dateName: '신정', date: '2024-01-01' });
    });
  });

  describe('isHoliday', () => {
    it('ShouldReturnHolidayInfoWhenDateIsHoliday', () => {
      const holidayMap = new Map<string, HolidayInfo>([
        ['20240101', { dateName: '신정', date: '2024-01-01' }],
        ['20240301', { dateName: '삼일절', date: '2024-03-01' }],
      ]);

      const result = isHoliday(2024, 0, 1, holidayMap); // Month is 0-indexed

      expect(result).toEqual({ dateName: '신정', date: '2024-01-01' });
    });

    it('ShouldReturnNullWhenDateIsNotHoliday', () => {
      const holidayMap = new Map<string, HolidayInfo>([
        ['20240101', { dateName: '신정', date: '2024-01-01' }],
      ]);

      const result = isHoliday(2024, 0, 2, holidayMap);

      expect(result).toBe(null);
    });

    it('ShouldHandleMonthIndexCorrectly', () => {
      const holidayMap = new Map<string, HolidayInfo>([
        ['20241225', { dateName: '크리스마스', date: '2024-12-25' }],
      ]);

      // Month 11 (December in 0-indexed)
      const result = isHoliday(2024, 11, 25, holidayMap);

      expect(result).toEqual({ dateName: '크리스마스', date: '2024-12-25' });
    });

    it('ShouldPadSingleDigitMonthAndDay', () => {
      const holidayMap = new Map<string, HolidayInfo>([
        ['20240301', { dateName: '삼일절', date: '2024-03-01' }],
      ]);

      const result = isHoliday(2024, 2, 1, holidayMap); // March 1

      expect(result).toEqual({ dateName: '삼일절', date: '2024-03-01' });
    });

    it('ShouldReturnNullWhenMapIsEmpty', () => {
      const holidayMap = new Map<string, HolidayInfo>();

      const result = isHoliday(2024, 0, 1, holidayMap);

      expect(result).toBe(null);
    });
  });

  describe('isSunday', () => {
    it('ShouldReturnTrueWhenDateIsSunday', () => {
      // 2024-01-07 is Sunday
      expect(isSunday(2024, 0, 7)).toBe(true);
      // 2024-01-14 is Sunday
      expect(isSunday(2024, 0, 14)).toBe(true);
    });

    it('ShouldReturnFalseWhenDateIsNotSunday', () => {
      // 2024-01-01 is Monday
      expect(isSunday(2024, 0, 1)).toBe(false);
      // 2024-01-06 is Saturday
      expect(isSunday(2024, 0, 6)).toBe(false);
    });

    it('ShouldHandleMonthIndexCorrectly', () => {
      // 2024-12-01 is Sunday
      expect(isSunday(2024, 11, 1)).toBe(true);
      // 2024-12-02 is Monday
      expect(isSunday(2024, 11, 2)).toBe(false);
    });

    it('ShouldHandleLeapYear', () => {
      // 2024-02-25 is Sunday (leap year)
      expect(isSunday(2024, 1, 25)).toBe(true);
    });

    it('ShouldHandleNonLeapYear', () => {
      // 2023-02-26 is Sunday (non-leap year)
      expect(isSunday(2023, 1, 26)).toBe(true);
    });
  });
});
