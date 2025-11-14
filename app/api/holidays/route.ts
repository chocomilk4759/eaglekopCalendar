import { NextRequest, NextResponse } from 'next/server';

interface GoogleCalendarEvent {
  summary: string;
  start: {
    date: string; // YYYY-MM-DD
  };
  end: {
    date: string;
  };
}

interface GoogleCalendarResponse {
  items: GoogleCalendarEvent[];
}

export interface HolidayInfo {
  dateName: string;
  date: string;
}

/**
 * 서버 사이드 공휴일 API 엔드포인트
 * GET /api/holidays?year=2025&month=1
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  // 파라미터 검증
  if (!year || !month) {
    return NextResponse.json(
      { error: 'year와 month 파라미터가 필요합니다.' },
      { status: 400 }
    );
  }

  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);

  if (
    isNaN(yearNum) ||
    isNaN(monthNum) ||
    yearNum < 1900 ||
    yearNum > 2100 ||
    monthNum < 1 ||
    monthNum > 12
  ) {
    return NextResponse.json(
      { error: '유효하지 않은 year 또는 month 값입니다.' },
      { status: 400 }
    );
  }

  // 서버 전용 환경 변수 (NEXT_PUBLIC_ 접두사 없음)
  const API_KEY = process.env.GOOGLE_API_KEY || '';
  const CALENDAR_ID = 'ko.south_korea%23holiday%40group.v.calendar.google.com';

  if (!API_KEY || API_KEY === 'your_google_api_key_here') {
    console.warn('Google API 키가 설정되지 않았습니다.');
    return NextResponse.json({ holidays: [] });
  }

  // 날짜 범위 계산
  const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
  const lastDay = new Date(yearNum, monthNum, 0).getDate();
  const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const params = new URLSearchParams({
    key: API_KEY,
    timeMin: `${startDate}T00:00:00Z`,
    timeMax: `${endDate}T23:59:59Z`,
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?${params}`,
      {
        next: { revalidate: 86400 }, // 24시간 캐시
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: GoogleCalendarResponse = await response.json();

    // YYYYMMDD를 키로 하는 배열 생성
    const holidays: Array<[string, HolidayInfo]> = [];

    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((event) => {
        if (event.start?.date) {
          const dateKey = event.start.date.replace(/-/g, ''); // YYYYMMDD 형식으로 변환
          holidays.push([
            dateKey,
            {
              dateName: event.summary,
              date: event.start.date,
            },
          ]);
        }
      });
    }

    return NextResponse.json({ holidays });
  } catch (error) {
    console.error('Google Calendar API 호출 실패:', error);
    return NextResponse.json(
      { error: '공휴일 데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
