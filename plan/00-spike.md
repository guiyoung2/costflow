# Phase 0 스파이크 결과

> 완료: 2026-06-05

## 0-1: Hook 이벤트 payload 스키마

### 공통 필드 (모든 hook)
| 필드 | 타입 | 설명 |
|------|------|------|
| `session_id` | string | 세션 식별자 |
| `transcript_path` | string | 해당 세션의 JSONL 파일 절대 경로 |
| `cwd` | string | 실행 디렉토리 |
| `permission_mode` | string | default \| plan \| acceptEdits \| auto \| dontAsk \| bypassPermissions |
| `hook_event_name` | string | 이벤트 이름 |

### UserPromptSubmit
추가 필드:
- `prompt` (string): 사용자가 제출한 프롬프트 원문

출력 제어: `decision:"block"`, `reason`, `additionalContext`, `sessionTitle`, `suppressOriginalPrompt`

### Stop
추가 필드:
- `effort.level` (string): low \| medium \| high \| xhigh \| max

발생 시점: **turn마다** (응답 완료 후). 세션 종료가 아님.
출력 제어: `decision:"block"` (exit 2) → Claude가 멈추지 않고 대화 계속

### SessionEnd
추가 필드: 없음 (공통 필드만)
Matcher: `"clear"` \| `"resume"` \| `"logout"` \| `"prompt_input_exit"` \| `"bypass_permissions_disabled"` \| `"other"`
발생 시점: 세션이 종료될 때 **1회**. 블로킹 불가.

### PreCompact
추가 필드: 없음 (공통 필드만)
Matcher: `"manual"` \| `"auto"`
출력 제어: `decision:"block"` → 압축 취소

### ⚠️ 핵심 발견

**hook payload에는 토큰 수가 없다.** 실제 토큰은 `transcript_path`가 가리키는 JSONL 파일에서 파싱해야 한다.

---

## 0-2: Transcript JSONL 파서 PoC

### 파일 위치
```
~/.claude/projects/<project-slug>/<session-id>.jsonl
```

### JSONL 레코드 타입 목록
| type | 설명 |
|------|------|
| `assistant` | Claude 응답 — **토큰/tool call이 여기에** |
| `user` | 사용자 메시지 (tool_result 포함) |
| `attachment` | hook 이벤트, 파일 첨부 등 |
| `system` | 시스템 메시지 |
| `last-prompt` | 세션의 마지막 프롬프트 포인터 |
| `ai-title` | 세션 제목 |
| `mode` | 권한 모드 |
| `permission-mode` | 권한 모드 상세 |
| `file-history-snapshot` | 파일 히스토리 스냅샷 |
| `queue-operation` | 큐 작업 |

### 토큰 추출 위치
```
record.type === "assistant"
  └─ record.message.usage
       ├─ input_tokens              (실제 입력 토큰)
       ├─ output_tokens             (실제 출력 토큰)
       ├─ cache_creation_input_tokens  (캐시 생성 토큰)
       ├─ cache_read_input_tokens      (캐시 읽기 토큰)
       ├─ server_tool_use.web_search_requests
       ├─ server_tool_use.web_fetch_requests
       ├─ service_tier              ("standard" 등)
       ├─ speed                     ("standard" 등)
       └─ iterations[]              (multi-step turn 세부 분해)
record.message.model  → 모델명 (예: "claude-sonnet-4-6")
```

### Tool Call 추출 위치
```
record.type === "assistant"
  └─ record.message.content[]
       └─ .type === "tool_use"
            ├─ .name    (도구명: Bash, Read, Edit, Agent, Skill, ...)
            ├─ .id      (호출 ID)
            └─ .input   (입력 파라미터)
```

#### Skill 추출
```js
c.name === "Skill" → c.input.skill  // 예: "superpowers:executing-plans"
```

#### Agent(subagent) 추출
```js
c.name === "Agent" → {
  description: c.input.description,   // 에이전트 설명
  subagent_type: c.input.subagent_type, // 에이전트 타입 (없을 수 있음)
  isolation: c.input.isolation,         // worktree 여부
}
```

### 토큰 출처 판정 로직
```
transcript에서 message.usage 파싱 성공 → tokenSource = "actual"
파싱 성공했지만 모든 토큰이 0      → tokenSource = "unknown"
transcript_path 없거나 파싱 실패   → tokenSource = "estimated" (추정 필요)
```

### PoC 실측값 (bb70a02d 세션, costflow 프로젝트)
```json
{
  "sessionId": "bb70a02d-8dec-4509-80d6-37ae0e88867b",
  "model": "claude-sonnet-4-6",
  "tokenSource": "actual",
  "tokens": {
    "input": 18071,
    "output": 17779,
    "cacheCreation": 111443,
    "cacheRead": 1748541
  },
  "toolCalls": 18,
  "skillCalls": [{ "skill": "superpowers:executing-plans" }],
  "agentCalls": 0,
  "turnCount": 42
}
```

---

## 게이트 판정

- [x] `actual` 토큰 1건 이상 추출 완료 (input: 18,071 / output: 17,779)
- [x] 출처 판정 로직 통과 (`actual` / `estimated` / `unknown` 분기 구현)
- [x] tool call 이름 추출 가능
- [x] skill 호출 추출 가능 (`Skill` tool → `input.skill`)
- [x] agent 호출 추출 가능 (`Agent` tool → `input.description`)

**→ Phase 0 스파이크 통과. Phase 1 진행 가능.**

---

## 구현 시 주의사항

1. **Stop ≠ 세션 종료**: `Stop`은 turn마다 발생. 세션 단위 집계에는 `SessionEnd`를 사용.
2. **hook에 토큰 없음**: 반드시 `transcript_path` → JSONL 파싱 필요.
3. **cache 토큰 합산**: 유효 입력 = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`
4. **subagent JSONL 별도**: `<session-id>/subagents/agent-<id>.jsonl` 형태로 별도 파일. 메인 세션 집계에 포함 여부 결정 필요.
5. **skill/agent 흔적은 안정적**: `tool_use` 레코드에 항상 기록되므로 신뢰 가능.
