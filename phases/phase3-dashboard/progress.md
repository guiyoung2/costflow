# phase3-dashboard 진행 현황

## 마지막 업데이트
2026-06-05T04:56:27.8990473+09:00

## 완료된 작업
- Step 1: auth-layout-home — route group 분리, 인증 대시보드 레이아웃, NavBar, 홈 화면 구성 완료.

## 현재 진행 중
- 없음

## 다음 할 일
- Step 2: api-key-routes 구현.
- `SUPABASE_SERVICE_ROLE_KEY`는 `app/api/` 서버 코드에서만 사용하고, API key는 발급 응답에 평문 1회만 포함한다.

## 주의사항
- `auth/callback/route.ts`, `middleware.ts`, `apps/src/lib/supabase/*`는 Step 1에서 수정하지 않았다.
- 로컬 런타임 확인에는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 필요하다. 더미 public env로 미인증 `/` 접근이 `/login`으로 307 리디렉트되고 `/login`이 200 응답하는 것은 확인했다.
- 실제 로그인 상태의 홈 화면과 로그아웃 클릭은 Supabase 계정/세션이 있어야 수동 확인 가능하다.
