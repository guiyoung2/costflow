# Phase 10: Codex Hook 자동화 계획

> 상태: 계획 확정 (미구현)
> 관련 Phase: Phase 9 (Codex 파일 스캔 연동)
> 검토: Claude Code + Codex 상호 검토 완료 (2026-06-09)

---

## 목표

`costflow init`을 실행하면 Claude Code hook처럼 Codex hook도 자동으로 등록되게 한다.  
사용자가 별도로 `costflow codex enable`을 실행할 필요 없이 한 번의 `init`으로 두 도구가 모두 연결된다.

---

## 배경 — Codex hooks.json 조사 결과

| 항목 | 내용 |
|------|------|
| 파일 위치 | `<repo>/.codex/hooks.json` (프로젝트별) 또는 `~/.codex/hooks.json` (전역) |
| 지원 이벤트 | `Stop`, `UserPromptSubmit`, `SessionStart`, `PreToolUse`, `PostToolUse`, `PreCompact` 등 |
| stdin 형식 | Claude Code와 동일: `hook_event_name`, `session_id`, `transcript_path`, `cwd`, `model`, `turn_id` |
| Windows 지원 | `commandWindows` 필드로 별도 지정 가능 (실험적 기능) |
| 신뢰 모델 | 프로젝트별 hooks는 Codex UI에서 **한 번 trust 승인** 필요 |
| 버전 요구 | v0.114 이상 (2026-03 출시). 이하 버전은 hooks 미지원 → scheduler fallback |

Codex stdin 형식이 Claude Code와 거의 동일하므로 **기존 `runHook()`을 재사용**할 수 있다.

---

## 확정 범위

### 1. Claude transcript turn_index 0-based 통일

**배경:** 현재 `transcript.ts`는 `turn_index = 0`에서 시작 후 `turn_index++`를 하므로 첫 번째 assistant turn이 1로 반환된다. Codex parser는 0-based(`turn_index = 0`이 첫 번째 turn)이다. 두 파서가 같은 `token_usage` 테이블에 `session_id, turn_index`로 upsert하므로 반드시 통일해야 한다.

**변경:** `transcript.ts`의 `let turn_index = 0` → `let turn_index = -1`

**fixture 테스트로 고정할 케이스:**
- 3-turn transcript의 첫 번째 turn: `turn_index = 0`
- 3-turn transcript의 마지막 turn: `turn_index = 2`
- assistant 없음: `turn_index = 0` (기존 `!lastAssistant` 조기 반환 경로 유지)
- usage 없는 assistant: `turn_index`가 음수가 되지 않음 (항상 ≥ 0)

### 2. tool_calls retry 중복 최소 방지

**변경:**
- DB 마이그레이션: `UNIQUE(session_id, turn_index, tool_name)` 추가
- ingestion: `ignoreDuplicates` 사용

**주의사항:**
- `turn_index`는 현재 스키마에서 nullable이므로, `turn_index`가 있는 경우(Stop 이벤트)에서만 중복 방지가 완전하게 동작한다. 실사용 경로(hook Stop → parser turn_index 포함)는 정상 동작.
- 마이그레이션과 ingestion 변경은 **같은 step에서 같이 반영**해야 한다. 둘 중 하나만 적용하면 중복 방지가 반쪽짜리가 된다.
- **제한:** 같은 turn에서 동일 tool을 여러 번 호출하면 1회로 축소 집계될 수 있다. 이는 알려진 제한으로 향후 개선 대상.

### 3. tool_call_id 기반 정확 집계 — Phase 10 제외

transcript.ts 타입, sender.ts, ingestion API, 마이그레이션까지 연쇄 변경이 필요하므로 Phase 10 범위를 벗어난다. 추후 별도 개선으로 남긴다.

### 4. Codex hook Windows/macOS 공통 동작

- `.codex/hooks.json` 생성/수정은 Node `fs`/`path` 사용 (bash 전용 문법 없음)
- hooks.json에 `command` + `commandWindows` 필드 모두 작성
- 호출 명령: `costflow hook --agent codex` (Windows/macOS 동일)

---

## 구현 계획

### Step A: `costflow init` Codex hook 등록 통합

**파일: `packages/cli/src/settings.ts`**

`addCostflowHooks()` 패턴을 참조해 Codex 전용 함수 추가:

```ts
export function addCodexHooks(hooksJsonPath: string): void { ... }
export function removeCodexHooks(hooksJsonPath: string): void { ... }
export function hasCodexHooks(hooksJsonPath: string): boolean { ... }
```

hooks.json 형식:
```json
{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "costflow hook --agent codex", "commandWindows": "costflow hook --agent codex" }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "costflow hook --agent codex", "commandWindows": "costflow hook --agent codex" }] }]
  }
}
```

**파일: `packages/cli/src/commands/init.ts`**

`runInit()` 마지막에 Codex 설정 여부 질문 추가:

```
Codex hook도 등록할까요? (Codex v0.114+ 필요) [y/N]:
```

- y → `addCodexHooks(path.join(cwd, '.codex', 'hooks.json'))` 호출
- 완료 메시지에 "Codex를 열고 /hooks 메뉴에서 costflow를 trust 해주세요" 안내

### Step B: `runHook()` Codex 분기 + turn_index 0-based + tool_calls 중복 방지

이 step에서 다음 세 가지를 함께 처리한다 (분리 금지):

**파일: `packages/cli/src/hook-runner/transcript.ts`**

- `let turn_index = 0` → `let turn_index = -1`
- transcript 파서 fixture 테스트 추가 (`transcript.test.ts` 신규)
- `packages/cli/package.json` test 스크립트를 명시적 목록으로 변경: `tsc && node --test dist/codex/parser.test.js dist/hook-runner/transcript.test.js` (glob은 Windows shell에서 동작이 흔들릴 수 있으므로 명시 목록이 안전)

**파일: `packages/cli/src/commands/hook.ts`**

`--agent codex` 플래그 처리:

```ts
const agent = process.argv.includes('--agent') 
  ? process.argv[process.argv.indexOf('--agent') + 1] 
  : 'claude';
```

`sendEvent()` 호출 시 `agent` 필드 전달.

**DB 마이그레이션 + ingestion (같은 step에서 처리):**

- `supabase/migrations/007_tool_calls_unique.sql`: 기존 중복 row 제거 후 `UNIQUE(session_id, turn_index, tool_name)` 추가 (중복이 있으면 마이그레이션 실패하므로 dedup 선행 필수)
- `apps/src/lib/ingestion/index.ts`: tool_calls insert에 `ignoreDuplicates` 적용

### Step C: `costflow uninstall` Codex hook 제거

**파일: `packages/cli/src/commands/uninstall.ts`**

`.codex/hooks.json`이 존재하면 `removeCodexHooks()` 함께 호출.

### Step D: `costflow status` Codex hook 상태 표시

**파일: `packages/cli/src/commands/status.ts`**

`hasCodexHooks()` 결과를 status 출력에 추가.

---

## 리스크 & 주의사항

| 리스크 | 대응 |
|--------|------|
| Codex v0.114 미만 설치 → hooks 미동작 | init 완료 시 버전 확인 안내 출력 |
| Windows hooks 실험적 기능 → 불안정 가능 | init 시 Windows 여부 감지, 불안정 경고 + scheduler fallback 안내 |
| 프로젝트 trust 승인 미완료 → hook 미실행 | init 완료 메시지에 trust 절차 명시 |
| 기존 `costflow sync` + 스케줄러 방식 | **유지** — hook 방식과 병행 가능. hook이 안 되면 scheduler 사용 |
| turn_index nullable로 tool_calls 중복 방지 불완전 | Stop 이벤트에서만 완전 동작, 실사용 경로 정상. 제한 명시 |

---

## 완료 기준

1. `npm run build && npm run typecheck` 통과
2. transcript 파서 fixture 테스트 통과 (first=0, last=2, no-assistant=0, no-usage not-negative)
3. `costflow init` 실행 시 Codex hook 등록 여부를 묻고 등록한다
4. 등록 후 `.codex/hooks.json` 파일이 생성된다
5. Codex에서 `costflow hook --agent codex` 호출 시 데이터가 대시보드로 전송된다 (agent='codex')
6. `costflow uninstall` 시 `.codex/hooks.json`에서도 hook이 제거된다
7. tool_calls UNIQUE 제약 + ignoreDuplicates가 같은 배포에 포함된다

---

## 작업 볼륨 예상

| 파일 | 변경 규모 |
|------|-----------|
| `packages/cli/src/hook-runner/transcript.ts` | -1줄 (turn_index 초기값) |
| `packages/cli/src/hook-runner/transcript.test.ts` | 신규 ~60줄 |
| `packages/cli/src/settings.ts` | +40줄 (Codex hook 함수 3개) |
| `packages/cli/src/commands/init.ts` | +15줄 (Codex 등록 분기) |
| `packages/cli/src/commands/hook.ts` | +5줄 (`--agent` 플래그 파싱) |
| `packages/cli/src/commands/uninstall.ts` | +5줄 (Codex hook 제거) |
| `packages/cli/src/commands/status.ts` | +5줄 (Codex 상태 출력) |
| `supabase/migrations/007_tool_calls_unique.sql` | 신규 ~5줄 |
| `apps/src/lib/ingestion/index.ts` | +2줄 (ignoreDuplicates) |

총 ~138줄. Step B는 마이그레이션·ingestion·transcript 변경을 반드시 한 번에 배포.
