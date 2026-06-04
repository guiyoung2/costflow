# phase3-dashboard 진행 현황

## 마지막 업데이트
2026-06-05T05:03:03+0900 — Step 1/3 완료

## 완료된 작업
- Step 1: auth-layout-home — 인증 route group, dashboard layout, NavBar, 홈 화면을 구성하고 build/typecheck를 통과했다.

## 현재 진행 중
- Step 2: api-key-routes

## 다음 할 일
- Step 2: api-key-routes
  - 인증 사용자 기준 `GET /api/api-keys`, `POST /api/api-keys`, `DELETE /api/api-keys/[id]` route handler를 구현한다.
  - API key는 발급 응답에서만 평문을 보여주고 DB에는 hash와 prefix만 저장한다.
  - `SUPABASE_SERVICE_ROLE_KEY`는 `app/api/` 서버 코드에서만 사용한다.

## 주의사항
- `middleware.ts`와 `apps/src/lib/supabase/`는 Step 1 범위에서 수정하지 않았다.
- `auth/callback/route.ts`는 route group 밖에 유지해야 한다.
- Next dev 서버를 `apps` workspace 기준으로 실행하면 루트 `.env.local`을 자동으로 읽지 못할 수 있다. 로컬 수동 검증 시 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 프로세스 환경에 주입해야 한다.
- 실제 로그인 상태 화면과 로그아웃 클릭은 계정 인증 정보가 필요하다. 이번 step에서는 build/typecheck, 미인증 `/` 접근의 `/login` 리디렉트, `/login` 렌더링을 확인했다.
