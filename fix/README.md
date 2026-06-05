# 수정 이력

> 세션 작업이 끝나면 한 줄 추가: `- YYYY-MM-DD · 작업: 요약`
> 버그는 `원인`·`수정`을 들여쓰기로 기록.

---

- 2026-06-05 · Phase 0 스파이크: transcript 파싱 PoC, hook payload 스키마 확인
- 2026-06-05 · Phase 1 스캐폴드: npm workspaces 모노레포, harness 부트스트랩, plan/fix/docs 체계 수립
- 2026-06-05 · 구조 변경: apps/web/ → apps/ (web 서브디렉토리 제거), git 초기화 및 GitHub push
- 2026-06-05 · Phase 2: Supabase 클라이언트 설치, 7개 테이블 린 스키마 마이그레이션, RLS 정책(21개), Auth 미들웨어 + 콜백 라우트 + 로그인 페이지 생성, build 통과
- 2026-06-05 · Phase 3: 인증 레이아웃, API key CRUD, Settings UI
- 2026-06-05 · Phase 3 리뷰 수정: 이중 getUser() 제거, window.prompt() → 인라인 폼, per-key loading, 복사 에러 처리, name 길이 검증, NavBar router.push() + 에러 처리
- 2026-06-05 · Phase 4: CLI 전체 구현 — config/settings/init/status/uninstall/outbox/flush/hook-runner(토큰 파싱, 마스킹, 비차단) feat-1~9 모두 통과
- 2026-06-05 · Phase 5: Ingestion API 구현 — POST /api/events, API key 인증, project/session upsert, token_usage 멱등 처리, 프롬프트 저장 모드
- 2026-06-05 · ESLint 설정: eslint-config-next v16 flat config 도입, react-hooks/set-state-in-effect 비활성화(async loadKeys 패턴)
