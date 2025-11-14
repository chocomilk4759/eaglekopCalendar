import { MetadataRoute } from 'next';

/**
 * 동적 사이트맵 생성 (Next.js 14 App Router)
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://eaglekopcalendar.vercel.app';

  // 기본 페이지 (메인 캘린더)
  const mainPage: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  // 추가 페이지가 있다면 여기에 추가
  // 예: 프리셋 관리 페이지, 검색 페이지 등

  return mainPage;
}
