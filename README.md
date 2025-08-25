# Shared Annual Planner (Next.js + Supabase on Vercel)

모든 사용자가 **동일한 화면**을 보도록 중앙 DB를 사용합니다. 특정 사용자에게만 **편집 권한**을 부여할 수 있습니다.
- 요일 헤더와 날짜 그리드 **간격 확대**
- 프리셋 아이콘 **등록/삭제/수정**(에디터만)
- 달력 메모/프리셋은 **Supabase(Postgres)**에 저장
- 익명 사용자: **읽기 전용**
- 에디터 사용자: **쓰기 가능**

## 1) 배포
1. 이 리포를 Vercel 새 프로젝트로 가져오기
2. 환경변수 설정(Vercel Project → Settings → Environment Variables)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL= # ex) https://your-app.vercel.app
```

3. Supabase 프로젝트를 만든 뒤, `supabase.sql`의 **스키마 + 정책**을 SQL Editor에서 실행

4. 에디터 권한 부여
   - `user_roles` 테이블에 `role='editor'`로 사용자의 이메일을 추가

## 2) 로컬 개발
```bash
npm i
npm run dev
```

## 3) 주의
- 서버 라우트(API)는 Supabase **Auth 쿠키**를 사용합니다. 사용자는 우측 상단 **로그인** 버튼으로 이메일 Magic Link 로그인.
- **읽기 전용**은 로그인하지 않아도 됩니다.
- 서비스 롤 키는 **서버 라우트에서만 사용**됩니다(클라이언트로 노출 금지).