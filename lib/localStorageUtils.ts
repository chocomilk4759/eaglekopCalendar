/**
 * localStorage 유틸리티
 * - QuotaExceededError 처리
 * - 오래된 캐시 자동 정리
 */

/**
 * localStorage에 안전하게 데이터 저장
 * - 할당량 초과 시 오래된 캐시 정리 후 재시도
 * @param key 저장할 키
 * @param value 저장할 값
 * @returns 성공 여부
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // QuotaExceededError 처리
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      console.warn('localStorage 할당량 초과. 오래된 캐시를 정리합니다.');

      // 오래된 캐시 정리
      const cleaned = cleanOldCaches();

      if (cleaned > 0) {
        console.log(`${cleaned}개의 오래된 캐시를 삭제했습니다.`);

        // 재시도
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          console.error('캐시 정리 후에도 저장 실패:', retryError);
          return false;
        }
      } else {
        console.error('정리할 캐시가 없습니다. 저장 실패.');
        return false;
      }
    }

    console.error('localStorage 저장 실패:', error);
    return false;
  }
}

/**
 * 오래된 캐시 정리
 * - 만료된 항목 삭제
 * - 캐시 키 패턴: 'cal:', 'holiday-cache:', 'img-cache:'
 * @returns 삭제된 항목 수
 */
export function cleanOldCaches(): number {
  let deletedCount = 0;
  const now = Date.now();
  const keysToDelete: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 캐시 키 패턴 확인
      const isCacheKey =
        key.startsWith('cal:') ||
        key.startsWith('holiday-cache:') ||
        key.startsWith('img-cache:');

      if (!isCacheKey) continue;

      // 버전 키는 건너뛰기
      if (key === 'cal:ver') continue;

      try {
        const item = localStorage.getItem(key);
        if (!item) continue;

        // JSON 파싱 시도
        const parsed = JSON.parse(item);

        // 만료 시간 확인
        if (typeof parsed === 'object' && parsed !== null && 'exp' in parsed) {
          if (typeof parsed.exp === 'number' && parsed.exp < now) {
            keysToDelete.push(key);
          }
        }
      } catch {
        // JSON 파싱 실패한 항목은 건너뛰기
        continue;
      }
    }

    // 수집된 키 삭제
    for (const key of keysToDelete) {
      localStorage.removeItem(key);
      deletedCount++;
    }

    return deletedCount;
  } catch (error) {
    console.error('캐시 정리 중 오류 발생:', error);
    return deletedCount;
  }
}

/**
 * localStorage 사용량 추정 (KB 단위)
 * @returns 대략적인 사용량 (KB)
 */
export function getLocalStorageSize(): number {
  let totalSize = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key) || '';
      // 키와 값의 길이를 합산 (대략적인 바이트 수)
      totalSize += (key.length + value.length) * 2; // UTF-16이므로 2배
    }

    return Math.round(totalSize / 1024); // KB로 변환
  } catch (error) {
    console.error('localStorage 크기 계산 실패:', error);
    return 0;
  }
}
