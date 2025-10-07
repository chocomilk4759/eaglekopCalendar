/**
 * 이미지 URL 캐싱 최적화
 * - Signed URL을 전역 캐시에 저장
 * - localStorage에 백업하여 새로고침 시에도 활용
 * - 만료 시간 관리로 불필요한 API 호출 최소화
 */

import { createClient } from './supabaseClient';
import { storage } from './utils';

const CACHE_KEY_PREFIX = 'img-cache:';
const CACHE_VERSION = 'v1';

interface CachedUrl {
  url: string;
  exp: number; // 만료 시간 (timestamp)
}

// 메모리 캐시 (빠른 접근)
const memoryCache = new Map<string, CachedUrl>();

/**
 * localStorage에서 캐시 로드
 */
function loadFromStorage(bucket: string, path: string): CachedUrl | null {
  const key = `${CACHE_KEY_PREFIX}${CACHE_VERSION}:${bucket}:${path}`;
  const cached = storage.get<CachedUrl | null>(key, null);

  if (cached && cached.exp > Date.now()) {
    return cached;
  }

  // 만료된 캐시 삭제
  if (cached) {
    storage.remove(key);
  }

  return null;
}

/**
 * localStorage에 캐시 저장
 */
function saveToStorage(bucket: string, path: string, cached: CachedUrl): void {
  const key = `${CACHE_KEY_PREFIX}${CACHE_VERSION}:${bucket}:${path}`;
  storage.set(key, cached);
}

/**
 * Supabase Storage Signed URL 생성 (캐싱 포함)
 */
export async function getSignedUrl(
  path: string,
  bucket = 'note-images',
  ttlSec = 3600
): Promise<string | null> {
  const now = Date.now();
  const cacheKey = `${bucket}:${path}`;

  // 1) 메모리 캐시 확인
  const memCached = memoryCache.get(cacheKey);
  if (memCached && memCached.exp > now) {
    return memCached.url;
  }

  // 2) localStorage 캐시 확인
  const storageCached = loadFromStorage(bucket, path);
  if (storageCached) {
    // 메모리 캐시에도 저장
    memoryCache.set(cacheKey, storageCached);
    return storageCached.url;
  }

  // 3) API 호출하여 새로 생성
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, ttlSec);

    if (error || !data?.signedUrl) {
      console.warn(`Failed to get signed URL for ${path}:`, error);
      return null;
    }

    // 캐시 저장 (실제 TTL의 90%만 사용하여 여유 확보)
    const safeMs = Math.max(60, Math.floor(ttlSec * 0.9)) * 1000;
    const cached: CachedUrl = {
      url: data.signedUrl,
      exp: now + safeMs,
    };

    memoryCache.set(cacheKey, cached);
    saveToStorage(bucket, path, cached);

    return data.signedUrl;
  } catch (error) {
    console.error(`Error creating signed URL for ${path}:`, error);
    return null;
  }
}

/**
 * 여러 이미지의 Signed URL을 병렬로 가져오기
 */
export async function getSignedUrlBatch(
  paths: string[],
  bucket = 'note-images'
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // 병렬 처리
  const promises = paths.map(async (path) => {
    const url = await getSignedUrl(path, bucket);
    if (url) {
      results.set(path, url);
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * 이미지 프리로딩 (보이지 않는 Image 객체 생성)
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload: ${url}`));
    img.src = url;
  });
}

/**
 * 여러 이미지 동시 프리로딩
 */
export async function preloadImages(urls: string[]): Promise<void> {
  await Promise.allSettled(urls.map(preloadImage));
}

/**
 * 캐시 초기화 (버전 업그레이드 시)
 */
export function clearImageCache(): void {
  memoryCache.clear();

  // localStorage에서 이미지 캐시만 삭제
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear image cache from localStorage', error);
  }
}
