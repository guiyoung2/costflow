# Costflow 진행 보드

> 새 세션 시작 시 **가장 먼저 읽는** 문서. 전체 계획은 루트의 `costflow_plan.md` 참조.

## 현재 단계

**Phase 2 완료 (2026-06-05)** → Phase 3 시작 대기

## Phase 진행 현황

| Phase | 이름 | 상태 | 완료일 |
|-------|------|------|--------|
| 0 | 스파이크 (선행 게이트) | ✅ 완료 | 2026-06-05 |
| 1 | 스캐폴드 + 워크플로우 | ✅ 완료 | 2026-06-05 |
| 2 | Supabase (린 스키마 + Auth + RLS) | ✅ 완료 | 2026-06-05 |
| 3 | 대시보드/API 베이스 | ⬜ 대기 | - |
| 4 | CLI / Hook Runner | ⬜ 대기 | - |
| 5 | Ingestion API + 마스킹 | ⬜ 대기 | - |
| 6 | 대시보드 화면 | ⬜ 대기 | - |
| 7 | 전체 스키마 정규화 | ⬜ 대기 | - |

## Phase 1 완료 항목

- npm workspaces 모노레포 (`apps` + `packages/cli`) 생성
- harness_framework 부트스트랩 (`.claude/`, `scripts/`, `harness.config.json`)
- `plan/` + `fix/` 폴더 + `CLAUDE.md` 워크플로우 세팅
- `docs/` 기본 문서 (PRD, ARCHITECTURE, ADR)

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

## Phase 2 시작 전 체크리스트

- [ ] Supabase 프로젝트 생성 (hosted 또는 local)
- [ ] `.env.local` 설정 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] `/harness`로 Phase 2 step 분해 + 승인 후 `python3 scripts/execute.py <phase-dir>` 실행
