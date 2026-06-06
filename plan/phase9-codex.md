# Phase 9 — Codex 사용량 연동 (파일 스캔 방식)

> **harness 작업 생성 전 이 문서를 먼저 읽고 참조할 것.** Phase 9의 단일 설계 기준 문서.

## Context

Costflow는 현재 Claude Code 사용량만 측정한다 (hook → `/api/events` → Supabase). 목표는 **Codex CLI와 Codex Desktop 앱**의 사용량도 같은 대시보드에서 보는 것이다. 참조 프로젝트(argos, ccusage) 모두 Codex를 지원하며, 핵심은 Codex가 세션 기록을 로컬 JSONL로 남긴다는 점이다.

### 확인된 사실 (조사 결과)

- Codex(CLI·Desktop 둘 다)는 세션을 `CODEX_HOME`(기본 `~/.codex`) 하위 `sessions/YYYY/MM/DD/rollout-*.jsonl`에 기록한다.
- 토큰은 `event_msg` 라인 중 `payload.type === "token_count"`에 **누적 합계(cumulative)**로 기록됨:
  - `input_tokens`, `cached_input_tokens`, `output_tokens`, `reasoning_output_tokens`, `total_tokens`
- 모델 슬러그는 `turn_context` 메타데이터에 있음.
- **2025-09 이전 로그에는 토큰 정보가 없음** (해당 라인은 무시).
- Codex CLI에도 hook 시스템(`~/.codex/hooks.json`)이 있으나 **(1) hook payload에 토큰이 없고**(Claude와 동일), **(2) 비관리형 hook은 `/hooks`에서 사용자 trust 필요**, **(3) Codex Desktop 업데이트 후 hook 미동작 버그 사례**가 있어 채택하지 않음.
- **Codex Cloud(웹)**는 OpenAI 서버에서 실행되어 로컬 기록을 남기지 않음 → 이 방식으론 측정 불가 → **범위 제외**.

### 결정사항 (사용자 확정)

1. **범위**: Codex CLI + Codex Desktop 앱. Cloud(웹) 제외.
2. **수집 방식**: **파일 스캔(폴링)**. Desktop hook 불안정성을 피하고 CLI·Desktop을 모두 안정적으로 커버하기 위함. 자동 실행은 OS 스케줄러로 보장.
3. **토큰 저장**: Codex 고유 토큰을 **기존 4컬럼에 매핑** (token_usage 스키마의 토큰 컬럼은 변경하지 않음).

### 의도한 결과

`costflow sync`가 스케줄러로 주기 실행되며 Codex JSONL을 자동 스캔해 기존 `/api/events`로 전송하고, 대시보드에서 Claude/Codex를 구분해 볼 수 있다.

---

## 아키텍처 개요

기존 Claude 경로(hook → sender → `/api/events` → ingestion)를 **최대한 재사용**한다. Codex는 hook 대신 `costflow sync` 명령이 JSONL을 파싱해 동일한 `HookEvent` 형태로 만들어 같은 sender/outbox/masking을 통과시킨다.

```
[스케줄러] → costflow sync
   → ~/.codex/sessions/**/rollout-*.jsonl 스캔 (mtime 커서로 변경분만)
   → 파서: token_count 누적→턴별 델타, model, tool calls, prompt 추출
   → 4컬럼 매핑 + agent:'codex' 부여
   → 기존 sendEvent() (sender.ts) → POST /api/events
   → ingestion: sessions.agent 저장, token_usage upsert(멱등)
```

### 토큰 매핑 (Codex → 기존 4컬럼)

| 기존 컬럼 | Codex 소스 |
|-----------|-----------|
| `input_tokens` | `input_tokens` |
| `cache_read_tokens` | `cached_input_tokens` |
| `output_tokens` | `output_tokens + reasoning_output_tokens` (reasoning은 과금상 출력에 포함, 합산) |
| `cache_creation_tokens` | `0` (Codex에 해당 개념 없음) |

- `token_count`는 누적값이므로 **연속 이벤트 간 델타 = 턴별 사용량**. 각 턴의 델타를 매핑해 저장한다.

### 멱등성 (파일 스캔 재실행 안전)

- `token_usage`는 `onConflict: session_id,turn_index` upsert이므로 재전송해도 안전.
- **주의:** `tool_calls`는 `insert`(upsert 아님)라서 같은 턴을 재전송하면 **중복**된다. → **sync 커서가 "세션별 마지막 전송 턴"을 기록해 이미 보낸 턴은 재전송하지 않음**으로 해결. 커서는 `~/.costflow`의 상태 파일(또는 기존 better-sqlite3 outbox DB)에 저장한다.

---

## 구현 단계 (harness Phase 9, step별)

> 각 step 파일은 자기완결적으로 작성. "이전 대화에서…" 같은 외부 참조 금지.

### Step 1 — 스키마: `sessions.agent` 추가

- 새 마이그레이션 `supabase/migrations/004_codex_agent.sql`:
  ```sql
  ALTER TABLE sessions
    ADD COLUMN agent text NOT NULL DEFAULT 'claude'
    CHECK (agent IN ('claude','codex'));
  ```
- 검증: 적용 후 기존 행이 `agent='claude'`로 채워지는지 확인.

### Step 2 — Codex rollout JSONL 파서 (`packages/cli`)

- 신규 `packages/cli/src/codex/parser.ts`:
  - 입력: rollout JSONL 파일 경로. 라인별 파싱.
  - 추출: `session_id`(파일명 또는 meta 라인), `model`(`turn_context`), 턴별 `token_count` 델타(4컬럼 매핑), `tool_use_names`(apply_patch/bash/MCP 등 PreToolUse/PostToolUse), `UserPromptSubmit` 프롬프트.
  - 출력: `HookEvent[]` (turn_index 부여, `agent:'codex'`).
  - 2025-09 이전(토큰 없음) 라인은 무시.
- **실제 rollout 파일로 포맷 검증 필수.** 사용자가 Codex 앱 사용 중이므로 `~/.codex/sessions`에 샘플이 존재한다. 정확한 라인 스키마(session_id 위치, turn 경계, tool 이벤트 필드명)는 샘플로 확정한다.
- 검증: 샘플 JSONL → 기대 토큰/모델/툴 추출 단위 테스트.

### Step 3 — `costflow sync` 명령

- 신규 `packages/cli/src/commands/sync.ts` + `index.ts` 라우팅.
  - `CODEX_HOME`(기본 `~/.codex`) 하위 `sessions/**/rollout-*.jsonl` 글롭.
  - mtime 커서로 변경된 파일만 재파싱. 세션별 "마지막 전송 턴" 커서로 신규 턴만 emit (tool_calls 중복 방지).
  - 각 이벤트에 기존 masking(`hook-runner/masking.ts`) 적용 후 `sendEvent()`(`sender.ts`) 재사용 → outbox 폴백도 자동.
- `sender.ts`의 `HookEvent`와 `apps/src/types/hook-event.ts`의 `HookEvent`에 `agent?: 'claude' | 'codex'` 필드 추가.
- 검증: 실제 세션 대상 `costflow sync` 1회 실행 → Supabase에 Codex 세션·토큰 행 생성. **두 번 실행해도 token_usage·tool_calls 중복 없음**.

### Step 4 — 자동 실행 (스케줄러 등록)

- 신규 `costflow codex enable` / `codex disable` (또는 `init`에 통합):
  - Windows `schtasks`로 `costflow sync`를 N분(예: 5분)마다 실행하는 작업 등록/해제. (사용자 OS = Windows 11)
  - mac/linux(cron·launchd)는 후속 — 지금 추상화하지 않음.
- 검증: 작업 등록 후 Codex 세션 발생 → 다음 주기에 대시보드 반영 확인.

### Step 5 — Ingestion: `agent` 수용

- `apps/src/lib/ingestion/index.ts` 세션 insert에 `agent: event.agent ?? 'claude'` 추가 (현재 session insert 블록). 기존 Claude 경로는 기본값으로 무변경.
- 검증: Codex 이벤트 수신 시 `sessions.agent='codex'` 저장.

### Step 6 — 대시보드: Claude/Codex 구분

- `/api/usage`, `/api/sessions`, `/api/tool-calls`에 선택적 `agent` 쿼리 파라미터 추가 + 쿼리를 `sessions.agent`로 필터링. sessions 응답에 `agent` 포함.
- UI: 사용량·세션 화면에 **Claude / Codex / 전체** 세그먼트 필터 + 세션 행에 agent 배지.
  - 디자인 원칙: AI SaaS 클리셰 금지, 에디토리얼 개발자 도구 톤 — 최소·절제된 토글/배지.
- 검증: 필터 전환 시 집계가 도구별로 분리됨.

### Step 7 — e2e 검증 & 문서

- 실제 Codex CLI/Desktop 세션 생성 → sync → 대시보드에서 토큰 분할·모델·툴·세션이 올바른지 확인.
- `plan/README.md` Phase 9 완료 마킹, `fix/README.md` 한 줄 추가, `docs/ADR.md`에 "Codex=파일 스캔 + 토큰 4컬럼 매핑" 결정 기록.

---

## 핵심 파일

| 구분 | 경로 | 변경 |
|------|------|------|
| 스키마 | `supabase/migrations/004_codex_agent.sql` | 신규 (sessions.agent) |
| 파서 | `packages/cli/src/codex/parser.ts` | 신규 |
| 명령 | `packages/cli/src/commands/sync.ts` | 신규 |
| 스케줄러 | `packages/cli/src/commands/codex.ts` (enable/disable) | 신규 |
| 라우팅 | `packages/cli/src/index.ts` | sync·codex 명령 등록 |
| 타입 | `packages/cli/src/hook-runner/sender.ts`, `apps/src/types/hook-event.ts` | `agent` 필드 추가 |
| 재사용 | `packages/cli/src/hook-runner/{sender,masking}.ts`, `packages/cli/src/outbox/` | 변경 없음(재사용) |
| Ingestion | `apps/src/lib/ingestion/index.ts` | session insert에 agent |
| API | `apps/src/app/api/{usage,sessions,tool-calls}/route.ts` | agent 필터 |
| UI | `apps/src/app/(dashboard)/{usage,sessions}/page.tsx` | agent 필터/배지 |

## 미해결 / 구현 중 확정할 점

- Codex rollout JSONL의 **정확한 라인 스키마**(session_id·turn 경계·tool 이벤트 필드명)는 실제 샘플 파일로 Step 2에서 확정.
- Desktop 앱이 정말 `~/.codex/sessions`를 공유하는지 Step 3 검증 시 실측 (issue 정황상 공유 가능성 높음).

## Verification (전체)

1. `npm run typecheck && npm run build` 통과.
2. 실제 Codex 세션 → `costflow sync` → Supabase에 `sessions.agent='codex'` + `token_usage`(4컬럼 매핑값) 생성.
3. `costflow sync` 재실행 → 중복 행 없음(멱등).
4. 대시보드에서 Claude/Codex 필터 전환 시 집계 분리·토큰 분할 정확.
5. 스케줄러 등록 후 새 Codex 세션이 자동 반영.

## 참고 자료

- Codex Hooks 문서: https://developers.openai.com/codex/hooks
- ccusage Codex 가이드(파일 위치·token_count 구조): https://ccusage.com/guide/codex/
- argos (Claude Code + Codex 동시 측정 참조): https://github.com/vibemafiaclub/argos
