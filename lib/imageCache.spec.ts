/**
 * lib/imageCache.ts 테스트
 *
 * TDD 패턴: 캐싱 로직, API 호출, 만료 처리 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSignedUrl,
  getSignedUrlBatch,
  preloadImage,
  preloadImages,
  clearImageCache,
} from './imageCache';

// Mock createSignedUrl function
const mockCreateSignedUrl = vi.fn();

// Mock Supabase client
vi.mock('./supabaseClient', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mockCreateSignedUrl,
      })),
    },
  })),
}));

// Mock utils storage
vi.mock('./utils', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

import { createClient } from './supabaseClient';
import { storage } from './utils';

describe('imageCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearImageCache(); // Clear memory cache
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSignedUrl', () => {
    it('ShouldReturnUrlWhenApiSucceeds', async () => {
      const mockUrl = 'https://example.com/image.jpg?token=abc';

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockUrl },
        error: null,
      });

      vi.mocked(storage.get).mockReturnValue(null); // No cache

      const result = await getSignedUrl('test.jpg');

      expect(result).toBe(mockUrl);
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('test.jpg', 3600);
    });

    it('ShouldReturnNullWhenApiReturnsError', async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: new Error('API error'),
      });

      vi.mocked(storage.get).mockReturnValue(null);

      const result = await getSignedUrl('test.jpg');

      expect(result).toBe(null);
    });

    it('ShouldReturnNullWhenApiThrows', async () => {
      mockCreateSignedUrl.mockRejectedValue(new Error('Network error'));

      vi.mocked(storage.get).mockReturnValue(null);

      const result = await getSignedUrl('test.jpg');

      expect(result).toBe(null);
    });

    it('ShouldUseMemoryCacheWhenAvailable', async () => {
      const mockUrl = 'https://example.com/cached.jpg';

      // First call to populate cache
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockUrl },
        error: null,
      });
      vi.mocked(storage.get).mockReturnValue(null);

      await getSignedUrl('test.jpg');

      // Second call should use cache
      mockCreateSignedUrl.mockClear();
      const result = await getSignedUrl('test.jpg');

      expect(result).toBe(mockUrl);
      expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    });

    it('ShouldUseLocalStorageCacheWhenMemoryCacheMisses', async () => {
      const mockUrl = 'https://example.com/storage-cached.jpg';
      const futureExp = Date.now() + 10000;

      vi.mocked(storage.get).mockReturnValue({
        url: mockUrl,
        exp: futureExp,
      });

      const result = await getSignedUrl('test.jpg');

      expect(result).toBe(mockUrl);
      expect(storage.get).toHaveBeenCalledWith('img-cache:v1:note-images:test.jpg', null);
    });

    it('ShouldIgnoreExpiredLocalStorageCache', async () => {
      const pastExp = Date.now() - 1000;

      vi.mocked(storage.get).mockReturnValue({
        url: 'https://example.com/expired.jpg',
        exp: pastExp,
      });

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/fresh.jpg' },
        error: null,
      });

      await getSignedUrl('test.jpg');

      expect(storage.remove).toHaveBeenCalledWith('img-cache:v1:note-images:test.jpg');
      expect(mockCreateSignedUrl).toHaveBeenCalled();
    });

    it('ShouldSaveToBothCachesAfterApiCall', async () => {
      const mockUrl = 'https://example.com/new.jpg';

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockUrl },
        error: null,
      });

      vi.mocked(storage.get).mockReturnValue(null);

      await getSignedUrl('test.jpg', 'note-images', 1000);

      expect(storage.set).toHaveBeenCalledWith(
        'img-cache:v1:note-images:test.jpg',
        expect.objectContaining({
          url: mockUrl,
          exp: expect.any(Number),
        })
      );
    });

    it('ShouldUseCustomBucketAndTtl', async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/custom.jpg' },
        error: null,
      });

      vi.mocked(storage.get).mockReturnValue(null);

      await getSignedUrl('test.jpg', 'custom-bucket', 7200);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith('test.jpg', 7200);
      expect(storage.set).toHaveBeenCalledWith(
        'img-cache:v1:custom-bucket:test.jpg',
        expect.any(Object)
      );
    });
  });

  describe('getSignedUrlBatch', () => {
    it('ShouldReturnEmptyMapWhenNoPathsProvided', async () => {
      const result = await getSignedUrlBatch([]);
      expect(result.size).toBe(0);
    });

    it('ShouldReturnMapWithSuccessfulUrls', async () => {
      mockCreateSignedUrl
        .mockResolvedValueOnce({
          data: { signedUrl: 'https://example.com/img1.jpg' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { signedUrl: 'https://example.com/img2.jpg' },
          error: null,
        });

      vi.mocked(storage.get).mockReturnValue(null);

      const result = await getSignedUrlBatch(['img1.jpg', 'img2.jpg']);

      expect(result.size).toBe(2);
      expect(result.get('img1.jpg')).toBe('https://example.com/img1.jpg');
      expect(result.get('img2.jpg')).toBe('https://example.com/img2.jpg');
    });

    it('ShouldSkipFailedUrls', async () => {
      mockCreateSignedUrl
        .mockResolvedValueOnce({
          data: { signedUrl: 'https://example.com/img1.jpg' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Failed'),
        });

      vi.mocked(storage.get).mockReturnValue(null);

      const result = await getSignedUrlBatch(['img1.jpg', 'img2.jpg']);

      expect(result.size).toBe(1);
      expect(result.get('img1.jpg')).toBe('https://example.com/img1.jpg');
      expect(result.has('img2.jpg')).toBe(false);
    });

    it('ShouldProcessPathsInParallel', async () => {
      const callOrder: number[] = [];
      mockCreateSignedUrl.mockImplementation(async (path: string) => {
        callOrder.push(parseInt(path.replace('img', '').replace('.jpg', '')));
        return {
          data: { signedUrl: `https://example.com/${path}` },
          error: null,
        };
      });

      vi.mocked(storage.get).mockReturnValue(null);

      await getSignedUrlBatch(['img1.jpg', 'img2.jpg', 'img3.jpg']);

      // All calls should be initiated before any completes
      expect(mockCreateSignedUrl).toHaveBeenCalledTimes(3);
    });
  });

  describe('preloadImage', () => {
    it('ShouldResolveWhenImageLoads', async () => {
      // Mock Image constructor with proper event simulation
      let loadHandler: (() => void) | null = null;

      const MockImage = vi.fn(function (this: HTMLImageElement) {
        return {
          set onload(handler: (() => void) | null) {
            loadHandler = handler;
          },
          get onload() {
            return loadHandler;
          },
          set onerror(_handler: (() => void) | null) {
            // Not used in this test
          },
          get onerror() {
            return null;
          },
          set src(value: string) {
            // Simulate immediate load success
            if (loadHandler) {
              setTimeout(() => loadHandler && loadHandler(), 0);
            }
          },
          get src() {
            return 'https://example.com/test.jpg';
          },
        };
      });

      vi.stubGlobal('Image', MockImage);

      await expect(preloadImage('https://example.com/test.jpg')).resolves.toBeUndefined();

      vi.unstubAllGlobals();
    });

    it('ShouldRejectWhenImageFailsToLoad', async () => {
      // Mock Image constructor with error simulation
      let errorHandler: (() => void) | null = null;

      const MockImage = vi.fn(function (this: HTMLImageElement) {
        return {
          set onload(_handler: (() => void) | null) {
            // Not used in this test
          },
          get onload() {
            return null;
          },
          set onerror(handler: (() => void) | null) {
            errorHandler = handler;
          },
          get onerror() {
            return errorHandler;
          },
          set src(_value: string) {
            // Simulate immediate load error
            if (errorHandler) {
              setTimeout(() => errorHandler && errorHandler(), 0);
            }
          },
          get src() {
            return 'https://example.com/invalid.jpg';
          },
        };
      });

      vi.stubGlobal('Image', MockImage);

      await expect(preloadImage('https://example.com/invalid.jpg')).rejects.toThrow(
        'Failed to preload'
      );

      vi.unstubAllGlobals();
    });
  });

  describe('preloadImages', () => {
    it('ShouldResolveWhenAllImagesLoad', async () => {
      const MockImage = vi.fn(function (this: HTMLImageElement) {
        // Each image instance needs its own handler
        let instanceLoadHandler: (() => void) | null = null;

        return {
          set onload(handler: (() => void) | null) {
            instanceLoadHandler = handler;
          },
          get onload() {
            return instanceLoadHandler;
          },
          set onerror(_handler: (() => void) | null) {
            // Not used
          },
          get onerror() {
            return null;
          },
          set src(_value: string) {
            // Trigger load immediately for this specific instance
            if (instanceLoadHandler) {
              setTimeout(() => instanceLoadHandler && instanceLoadHandler(), 0);
            }
          },
          get src() {
            return '';
          },
        };
      });

      vi.stubGlobal('Image', MockImage);

      await expect(
        preloadImages(['https://example.com/img1.jpg', 'https://example.com/img2.jpg'])
      ).resolves.toBeUndefined();

      vi.unstubAllGlobals();
    });

    it('ShouldResolveEvenWhenSomeImagesFail', async () => {
      let callCount = 0;

      const MockImage = vi.fn(function (this: HTMLImageElement) {
        const isFirstCall = callCount++ === 0;
        let loadHandler: (() => void) | null = null;
        let errorHandler: (() => void) | null = null;

        return {
          set onload(handler: (() => void) | null) {
            loadHandler = handler;
          },
          get onload() {
            return loadHandler;
          },
          set onerror(handler: (() => void) | null) {
            errorHandler = handler;
          },
          get onerror() {
            return errorHandler;
          },
          set src(_value: string) {
            if (isFirstCall && loadHandler) {
              setTimeout(() => loadHandler && loadHandler(), 0);
            } else if (!isFirstCall && errorHandler) {
              setTimeout(() => errorHandler && errorHandler(), 0);
            }
          },
          get src() {
            return '';
          },
        };
      });

      vi.stubGlobal('Image', MockImage);

      await expect(
        preloadImages(['https://example.com/img1.jpg', 'https://example.com/invalid.jpg'])
      ).resolves.toBeUndefined();

      vi.unstubAllGlobals();
    });
  });

  describe('clearImageCache', () => {
    it('ShouldClearMemoryCache', async () => {
      // Populate cache
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/cached.jpg' },
        error: null,
      });
      vi.mocked(storage.get).mockReturnValue(null);

      await getSignedUrl('test.jpg');

      // Verify cache is used
      mockCreateSignedUrl.mockClear();
      await getSignedUrl('test.jpg');
      expect(mockCreateSignedUrl).not.toHaveBeenCalled();

      // Clear cache
      clearImageCache();

      // Verify API is called again
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/fresh.jpg' },
        error: null,
      });

      await getSignedUrl('test.jpg');
      expect(mockCreateSignedUrl).toHaveBeenCalled();
    });

    it('ShouldRemoveImageCacheKeysFromLocalStorage', () => {
      localStorage.setItem('img-cache:v1:note-images:test1.jpg', 'value1');
      localStorage.setItem('img-cache:v1:note-images:test2.jpg', 'value2');
      localStorage.setItem('other-key', 'keep this');

      clearImageCache();

      expect(localStorage.getItem('img-cache:v1:note-images:test1.jpg')).toBe(null);
      expect(localStorage.getItem('img-cache:v1:note-images:test2.jpg')).toBe(null);
      expect(localStorage.getItem('other-key')).toBe('keep this');
    });

    it('ShouldNotThrowWhenLocalStorageIsEmpty', () => {
      expect(() => clearImageCache()).not.toThrow();
    });

    it('ShouldHandleLocalStorageErrors', () => {
      // Mock localStorage.key to throw
      const originalKey = localStorage.key;
      localStorage.key = vi.fn(() => {
        throw new Error('localStorage error');
      });

      expect(() => clearImageCache()).not.toThrow();

      localStorage.key = originalKey;
    });
  });
});
