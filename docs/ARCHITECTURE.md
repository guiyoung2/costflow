# Costflow 아키텍처

## 디렉토리 구조

```
costflow/                          # 모노레포 루트
├── apps/
│   └── web/                       # Next.js 15 App Router 대시보드/API
│       └── src/
│           └── app/
│               ├── (dashboard)/   # 인증 필요 페이지 (Phase 6)
│               ├── api/           # Route Handlers
│               │   ├── events/    # POST /api/events (hook ingestion)
│               │   ├── api-keys/  # API key 관리
│               │   ├── projects/  # 프로젝트 CRUD
│               │   ├── sessions/  # 세션 조회
│               │   └── usage/     # 사용량 요약
│               └── auth/          # Supabase Auth 콜백
├── packages/
│   └── cli/                       # Node.js CLI (npm publish)
│       └── src/
│           ├── index.ts           # 진입점 (costflow <command>)
│           ├── commands/          # init, hook, status, uninstall, flush
│           ├── hook-runner/       # transcript 파싱, 마스킹, API 전송
│           └── outbox/            # 실패 이벤트 로컬 저장 (SQLite)
├── plan/                          # 진행 보드 + 구현 주의사항
├── fix/                           # 버그·수정 이력
├── docs/                          # PRD, ARCHITECTURE, ADR (harness 참조)
├── scripts/                       # execute.py (harness 실행기)
├── phases/                        # harness 자동 생성 (gitignored)
└── .claude/                       # commands, rules, skills
```

## 시스템 흐름

```
Claude Code 프로젝트
  .claude/settings.json (hook: costflow hook)
  .costflow/project.json (project_id, api_key 위치)
        |
        | hook 이벤트 (UserPromptSubmit / Stop / SessionEnd / PreCompact)
        v
packages/cli (costflow hook)
  - transcript_path → JSONL 파싱 (토큰 추출)
  - 프롬프트 마스킹 (로컬, 기본 redacted)
  - outbox: 실패 시 ~/.costflow/outbox.sqlite 저장
        |
        | HTTPS POST /api/events
        | Authorization: Bearer <api_key>
        v
apps/src/app/api/events/
  - API key 검증 (hash 비교)
  - events / sessions / token_usage upsert
        |
        v
Supabase Postgres + RLS
        |
        | 조회
        v
apps (대시보드 UI)
  - /projects: 프로젝트 목록
  - /usage: 토큰 사용량 차트
  - /sessions: 세션 타임라인
  - /prompts: 마스킹된 프롬프트
  - /settings: API key, 마스킹 규칙
```

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript strict |
| 인증 | Supabase Auth (email) |
| DB | Supabase Postgres + RLS |
| 배포 | Vercel |
| CLI | Node.js + TypeScript |
| 로컬 outbox | better-sqlite3 (Phase 4) |
| 패키지 매니저 | npm (workspaces) |

## 데이터 흐름 — 토큰 수집

```
Stop 훅 발생 (turn마다)
  transcript_path → JSONL 읽기
  record.type === "assistant"
    → record.message.usage
         ├─ input_tokens              → token_usage.input_tokens
         ├─ output_tokens             → token_usage.output_tokens
         ├─ cache_creation_input_tokens → token_usage.cache_creation_tokens
         └─ cache_read_input_tokens   → token_usage.cache_read_tokens
    → record.message.model           → sessions.model
    → record.message.content[].type === "tool_use" → events (tool_calls)
```

⚠️ 4개 토큰 컬럼을 합산하지 말 것 — 별도 저장 후 대시보드에서 선택적 집계.
⚠️ Stop은 turn마다 → 멱등 upsert 또는 delta 방식으로 중복 합산 방지.
