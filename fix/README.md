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
- 2026-06-05 · Phase 6: 대시보드 화면 — 6개 API 라우트, /projects, /usage, /sessions, /prompts, Home 실데이터 연결
- 2026-06-05 · normalize-schema: messages/tool_calls/skill_usages/agent_usages 테이블 생성 + RLS + backfill migration 적용
- 2026-06-05 · ingestion-update: processEvent에 messages INSERT(⑥) + tool_calls INSERT(⑦) 추가, 빌드/타입체크 통과
- 2026-06-05 · tool-calls-api: GET /api/tool-calls 신규 + sessions API에 tool_call_count 추가, 빌드/타입체크 통과
- 2026-06-05 · tools-ui: Usage 화면에 Tool 사용량 섹션 추가, Sessions 화면에 tool_call_count 컬럼 추가, 빌드/타입체크 통과
- 2026-06-06 · tailwind-setup: Tailwind CSS v3 설치, tailwind.config.ts + postcss.config.js + globals.css 생성, layout.tsx import 추가, build/typecheck 통과
- 2026-06-06 · auth-pages: (auth)/layout.tsx 애니메이션 블롭 배경 생성, login/page.tsx Tailwind 글래스 카드 리디자인, signup/page.tsx 신규 생성, globals.css shadow-glow/50 @apply 오류 수정
- 2026-06-06 · layout-nav: Sidebar.tsx 클라이언트 컴포넌트 생성(usePathname 활성 하이라이트, 로그아웃), (dashboard)/layout.tsx 사이드바 레이아웃으로 교체, NavBar.tsx 삭제, build/typecheck 통과
