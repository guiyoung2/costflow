# Costflow 진행 보드

> 새 세션 시작 시 가장 먼저 읽는 문서입니다. 전체 계획은 루트의 `costflow_plan.md`를 참고합니다.

## 현재 단계

**Phase 3 완료 (2026-06-05)** → Phase 4 시작 대기

## Phase 진행 현황

| Phase | 이름 | 상태 | 완료일 |
|-------|------|------|--------|
| 0 | 스파이크 | 완료 | 2026-06-05 |
| 1 | 스캐폴드 + 워크플로우 | 완료 | 2026-06-05 |
| 2 | Supabase (스키마 + Auth + RLS) | 완료 | 2026-06-05 |
| 3 | 대시보드/API 베이스 | 완료 | 2026-06-05 |
| 4 | CLI / Hook Runner | 대기 | - |
| 5 | Ingestion API + 마스킹 | 대기 | - |
| 6 | 대시보드 화면 | 대기 | - |
| 7 | 전체 스키마 정규화 | 대기 | - |

## Phase 1 완료 항목

- npm workspaces 모노레포 (`apps` + `packages/cli`) 생성
- harness framework 부트스트랩 (`.claude/`, `scripts/`, `harness.config.json`)
- `plan/` + `fix/` 폴더 + `CLAUDE.md` 워크플로우 세팅
- `docs/` 기본 문서 (PRD, ARCHITECTURE, ADR)

## Phase 2 완료 항목

- Supabase 클라이언트 설치 및 환경 변수 예시 정리
- 7개 테이블 기본 스키마 마이그레이션 작성
- RLS 정책 21개 작성
- Auth middleware, callback route, login page 작성
- `npm run build`, `npm.cmd run typecheck` 통과

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

## Phase 0 스파이크 구현 주의사항

**Phase 2~7 진행 시 반드시 숙지. 자세한 내용은 `plan/implementation-notes.md`.**

1. **cache 토큰 4컬럼 분리**
   - `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`
   - 네 값을 합산하지 말고 DB에 별도 컬럼으로 저장
   - 합산하면 캐시 토큰이 과다 집계됨

2. **turn usage 멱등 합산**
   - `Stop` 이벤트는 turn마다 발생하며 세션 종료가 아님
   - 같은 turn usage를 중복 집계하지 않도록 멱등 처리 필요
   - 세션 단위 집계에는 `SessionEnd`를 사용

3. **hook에는 토큰 없음**
   - 반드시 `transcript_path`의 JSONL을 파싱해야 함

4. **Stop은 세션 종료가 아님**
   - `Stop`은 turn마다 발생
   - `SessionEnd`가 세션 종료

5. **subagent JSONL 별도 처리**
   - `subagents/agent-<id>.jsonl` 파일도 별도 처리 필요

## Phase 4 시작 전 체크리스트

- [ ] `phases/phase3-dashboard` 완료 기록 확인
- [ ] Phase 4 step 분해 및 사용자 승인
- [ ] `python scripts/execute.py <phase-dir>` 실행
