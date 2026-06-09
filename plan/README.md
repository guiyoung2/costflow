# Costflow 진행 보드

> 새 세션 시작 시 **가장 먼저 읽는** 문서. 전체 계획은 루트의 `costflow_plan.md` 참조.

## 현재 단계

**Phase 10 완료 (2026-06-10)**

## Phase 진행 현황

| Phase | 이름 | 상태 | 완료일 |
|-------|------|------|--------|
| 0 | 스파이크 (선행 게이트) | ✅ 완료 | 2026-06-05 |
| 1 | 스캐폴드 + 워크플로우 | ✅ 완료 | 2026-06-05 |
| 2 | Supabase (린 스키마 + Auth + RLS) | ✅ 완료 | 2026-06-05 |
| 3 | 대시보드/API 베이스 | ✅ 완료 | 2026-06-05 |
| 4 | CLI / Hook Runner | ✅ 완료 | 2026-06-05 |
| 5 | Ingestion API + 마스킹 | ✅ 완료 | 2026-06-05 |
| 6 | 대시보드 화면 | ✅ 완료 | 2026-06-05 |
| 7 | 전체 스키마 정규화 | ✅ 완료 | 2026-06-05 |
| 8 | UI 리디자인 (Tailwind + 회원가입) | ✅ 완료 | 2026-06-06 |
| 9 | Codex 사용량 연동 (파일 스캔) | ✅ 완료 | 2026-06-06 |
| 10 | Codex Hook 자동화 | ✅ 완료 | 2026-06-10 |

## 🚀 Phase 9 (Codex 연동) — 시작 전 필독

> **harness step 파일 생성 전 반드시 `plan/phase9-codex.md`를 먼저 읽고 참조할 것.** (단일 설계 기준 문서)

**목표:** Codex CLI + Codex Desktop 앱 사용량을 같은 대시보드에서 측정. (Cloud/웹은 로컬 기록이 없어 범위 제외)

### Phase 9 시작 전 알아야 할 것

1. **수집 방식은 hook이 아니라 파일 스캔(폴링).** Codex는 `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`에 세션을 남긴다. `costflow sync` 명령이 이를 파싱해 기존 `/api/events`로 전송하고, OS 스케줄러로 자동 실행한다. (Desktop hook 불안정성 때문에 hook 미채택)
2. **Codex Cloud(웹)는 측정 불가** — 로컬 파일이 없음. CLI·Desktop만 대상.
3. **토큰은 누적값(cumulative).** `token_count` 이벤트의 누적 합계 → **연속 이벤트 간 델타 = 턴별 사용량**으로 계산.
4. **토큰은 기존 4컬럼에 매핑** (token_usage 컬럼 변경 없음):
   - `input_tokens`→`input_tokens`, `cached_input_tokens`→`cache_read_tokens`,
     `output_tokens+reasoning_output_tokens`→`output_tokens`, `cache_creation_tokens`=`0`.
5. **도구 구분**은 `sessions.agent`(`claude`|`codex`) 컬럼 신설로 처리. 기존 행은 `claude` 기본값.
6. **Desktop이 `~/.codex/sessions`를 공유하는지**는 실제 샘플 파일로 구현 중 실측 확인 (정황상 공유 가능성 높음).

### Phase 9 작업 시 주의사항

1. **`tool_calls`는 `insert`(upsert 아님) → 재스캔 시 중복 위험.** sync 커서가 "세션별 마지막 전송 턴"을 기록해 이미 보낸 턴은 재전송하지 않게 한다. (커서는 `~/.costflow` 상태 파일/outbox DB)
2. **`token_usage`는 멱등 upsert** (`onConflict: session_id,turn_index`) — 재전송 안전.
3. **2025-09 이전 rollout 로그에는 토큰이 없다** — 해당 라인 무시.
4. **rollout JSONL의 정확한 라인 스키마**(session_id 위치, turn 경계, tool 이벤트 필드명)는 실제 샘플로 Step 2에서 확정한다 — 추측 금지.
5. **기존 Claude 경로는 무변경 유지.** ingestion·sender·outbox·masking을 재사용하고, `agent` 필드는 기본값 `claude`로 동작이 바뀌지 않게 한다.

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

## 검증 순서 (완료 기준)

```
1. npm.cmd run build
2. npm.cmd run typecheck
3. npm.cmd run test --workspace=packages/cli
```

> **주의:** `apps` typecheck는 `.next/types` 생성 이후 안정적으로 동작한다.
> clean checkout에서는 반드시 `build`를 먼저 실행한다.

## 향후 개선사항 (Phase 6 이전 처리 권장)

코드 리뷰에서 식별된 Minor 항목 — 현재 기능 동작에는 영향 없음.

- [ ] `(auth)` route group에 `layout.tsx` 추가 — 로그인 페이지 중앙 정렬 레이아웃 통합 (현재 `login/page.tsx`가 인라인 스타일로 직접 처리)
- [ ] Phase 6 진입 전 스타일링 시스템 결정 — CSS Modules 또는 Tailwind 선택 후 전체 인라인 스타일 일괄 교체 (현재 모든 컴포넌트가 인라인 스타일 사용)
