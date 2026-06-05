# Costflow 진행 보드

> 새 세션 시작 시 **가장 먼저 읽는** 문서. 전체 계획은 루트의 `costflow_plan.md` 참조.

## 현재 단계

**Phase 5 완료 (2026-06-05)** → Phase 6 시작 대기

## Phase 진행 현황

| Phase | 이름 | 상태 | 완료일 |
|-------|------|------|--------|
| 0 | 스파이크 (선행 게이트) | ✅ 완료 | 2026-06-05 |
| 1 | 스캐폴드 + 워크플로우 | ✅ 완료 | 2026-06-05 |
| 2 | Supabase (린 스키마 + Auth + RLS) | ✅ 완료 | 2026-06-05 |
| 3 | 대시보드/API 베이스 | ✅ 완료 | 2026-06-05 |
| 4 | CLI / Hook Runner | ✅ 완료 | 2026-06-05 |
| 5 | Ingestion API + 마스킹 | ✅ 완료 | 2026-06-05 |
| 6 | 대시보드 화면 | ⬜ 대기 | - |
| 7 | 전체 스키마 정규화 | ⬜ 대기 | - |

## Phase 1 완료 항목

- npm workspaces 모노레포 (`apps` + `packages/cli`) 생성
- harness_framework 부트스트랩 (`.claude/`, `scripts/`, `harness.config.json`)
- `plan/` + `fix/` 폴더 + `CLAUDE.md` 워크플로우 세팅
- `docs/` 기본 문서 (PRD, ARCHITECTURE, ADR)

## Phase 3 완료 항목

- 인증 route group 분리 및 dashboard layout 작성
- NavBar 추가 (`Home`, `Settings`, 로그아웃)
- Home 화면에서 로그인 사용자와 placeholder 프로젝트 정보 표시
- API key CRUD route 작성
  - `GET /api/api-keys`
  - `POST /api/api-keys`
  - `DELETE /api/api-keys/[id]`
- `ApiKey` 타입 추가
- `/settings` API key 관리 UI 작성
- `apps/tsconfig.tsbuildinfo` 추적 제거 및 `*.tsbuildinfo` ignore 추가
- `npm run build`, `npm.cmd run typecheck` 통과

## ⚠️ Phase 0 스파이크 구현 주의사항

**Phase 2~7 진행 시 반드시 숙지. 자세한 내용은 `plan/implementation-notes.md`.**

1. **cache 토큰 4컬럼 분리**
   - `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`
   - 이 4개를 합산하지 말고 DB에 별도 컬럼으로 저장
   - 합산하면 캐시 토큰이 과다 집계됨

2. **turn usage 멱등 합산**
   - `Stop` 훅은 **turn(응답)마다** 발생 (세션 종료가 아님)
   - 이미 집계된 turn의 usage를 중복 합산하지 않도록 멱등 처리 필요
   - 세션 단위 집계에는 `SessionEnd`를 사용

3. **hook에 토큰 없음**: 반드시 `transcript_path` → JSONL 파싱 필요
4. **Stop ≠ 세션 종료**: `Stop`은 turn마다, `SessionEnd`가 세션 종료
5. **subagent JSONL 별도**: `subagents/agent-<id>.jsonl` 파일 별도 처리 필요

## Phase 4 시작 전 체크리스트

- [ ] Phase 4 step 분해 + 승인
- [ ] `python scripts/execute.py <phase-dir>` 실행

## 향후 개선사항 (Phase 6 이전 처리 권장)

코드 리뷰에서 식별된 Minor 항목 — 현재 기능 동작에는 영향 없음.

- [ ] `(auth)` route group에 `layout.tsx` 추가 — 로그인 페이지 중앙 정렬 레이아웃 통합 (현재 `login/page.tsx`가 인라인 스타일로 직접 처리)
- [ ] Phase 6 진입 전 스타일링 시스템 결정 — CSS Modules 또는 Tailwind 선택 후 전체 인라인 스타일 일괄 교체 (현재 모든 컴포넌트가 인라인 스타일 사용)
