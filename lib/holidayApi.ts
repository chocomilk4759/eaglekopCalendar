// Google Calendar API - 한국 공휴일
// https://developers.google.com/calendar/api/guides/overview

export interface HolidayInfo {
  dateName: string;     // 공휴일명
  date: string;         // YYYY-MM-DD 형식
}

interface GoogleCalendarEvent {
  summary: string;
  start: {
    date: string;       // YYYY-MM-DD
  };
  end: {
    date: string;
  };
}

interface GoogleCalendarResponse {
  items: GoogleCalendarEvent[];
}

interface CachedHolidays {
  data: Array<[string, HolidayInfo]>; // Map을 배열로 변환하여 저장
  exp: number; // 만료 시간 (timestamp)
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const CALENDAR_ID = 'ko.south_korea%23holiday%40group.v.calendar.google.com'; // 한국 공휴일 캘린더
const CACHE_KEY_PREFIX = 'holiday-cache:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

/**
 * Google Calendar API를 사용해 한국 공휴일 정보 조회 (localStorage 캐싱 포함)
 * @param year 연도 (4자리)
 * @param month 월 (1-12)
 */
export async function getHolidays(year: number, month: number): Promise<Map<string, HolidayInfo>> {
  if (!API_KEY || API_KEY === 'your_google_api_key_here') {
    console.warn('Google API 키가 설정되지 않았습니다.');
    return new Map();
  }

  const cacheKey = `${CACHE_KEY_PREFIX}${year}-${String(month).padStart(2, '0')}`;
  const now = Date.now();

  // 1) localStorage 캐시 확인
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed: CachedHolidays = JSON.parse(cached);
      if (parsed.exp > now) {
        // 캐시 유효 → Map으로 복원하여 반환
        return new Map(parsed.data);
      } else {
        // 만료된 캐시 삭제
        localStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    console.warn('공휴일 캐시 로드 실패:', error);
  }

  // 2) API 호출
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const params = new URLSearchParams({
    key: API_KEY,
    timeMin: `${startDate}T00:00:00Z`,
    timeMax: `${endDate}T23:59:59Z`,
    singleEvents: 'true',
    orderBy: 'startTime'
  });

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?${params}`,
      { next: { revalidate: 86400 } } // 24시간 캐시
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: GoogleCalendarResponse = await response.json();

    // YYYYMMDD를 키로 하는 Map 생성
    const holidayMap = new Map<string, HolidayInfo>();

    if (data.items && Array.isArray(data.items)) {
      data.items.forEach(event => {
        if (event.start?.date) {
          const dateKey = event.start.date.replace(/-/g, ''); // YYYYMMDD 형식으로 변환
          holidayMap.set(dateKey, {
            dateName: event.summary,
            date: event.start.date
          });
        }
      });
    }

    // 3) localStorage에 캐시 저장
    try {
      const cacheData: CachedHolidays = {
        data: Array.from(holidayMap.entries()),
        exp: now + CACHE_TTL_MS
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('공휴일 캐시 저장 실패:', error);
    }

    return holidayMap;
  } catch (error) {
    console.error('Google Calendar API 호출 실패:', error);
    return new Map();
  }
}

/**
 * 특정 날짜가 공휴일인지 확인
 * @param year 연도
 * @param month 월 (0-11, JavaScript Date 형식)
 * @param day 일
 * @param holidayMap getHolidays로 가져온 공휴일 맵
 */
export function isHoliday(
  year: number,
  month: number,
  day: number,
  holidayMap: Map<string, HolidayInfo>
): HolidayInfo | null {
  const dateStr = `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  return holidayMap.get(dateStr) || null;
}

/**
 * 일요일 여부 확인
 */
export function isSunday(year: number, month: number, day: number): boolean {
  const date = new Date(year, month, day);
  return date.getDay() === 0;
}
