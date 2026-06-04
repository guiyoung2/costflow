# Costflow PRD 요약

> 전체 PRD는 루트의 `costflow_plan.md` 참조 (단일 기준 문서).
> 이 파일은 harness execute.py가 읽는 압축 요약본이다.

## 제품 개요

개인용 Claude Code 사용량 분석 대시보드.

- 대시보드/API: Next.js 15 → Vercel 배포
- 인증/DB: Supabase Auth + Postgres + RLS
- 데이터 수집: Claude Code 프로젝트 단위 hook
- CLI: `costflow init` 한 번으로 hook 등록

## 핵심 흐름

```
Claude Code 프로젝트 (.claude/settings.json hook)
  → Costflow CLI/Hook Runner (로컬, 마스킹 처리)
  → POST /api/events (API key 인증)
  → Supabase (sessions, events, token_usage)
  → Next.js 대시보드 (조회)
```

## 1.0 MVP 성공 기준 (요약)

1. 로그인 → API key 발급
2. `costflow init` → hook 등록
3. Claude Code 사용 → 자동 전송 + Supabase 저장
4. 대시보드에 프로젝트별 사용량 표시
5. 기본 프롬프트 저장은 redacted
6. 업로드 실패 시 outbox + flush (작업 비차단)
7. 프로젝트 hook 제거 및 데이터 삭제 가능

## 데이터 모델 (린 스타트)

린 스키마로 시작 → Phase 7에서 정규화:
- `profiles`, `api_keys` (hash+prefix)
- `projects`, `sessions`
- `events` (type + payload JSONB + token_source)
- `token_usage` (4컬럼 분리: input, output, cache_creation, cache_read)
- `prompt_storage_settings`

## 보안 필수 사항

- API key는 hash 저장 (평문 금지)
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용
- 기본 프롬프트 저장: redacted
- RLS: 사용자가 자기 데이터만 접근

## hook 이벤트

- `UserPromptSubmit`: 프롬프트 수집 (마스킹 후 전송)
- `Stop`: turn 완료마다 발생 (토큰 파싱 — transcript_path 필수)
- `SessionEnd`: 세션 종료 1회
- `PreCompact`: 컨텍스트 압축 기록

⚠️ 주의: hook payload에 토큰 없음. transcript_path → JSONL 파싱 필수.
⚠️ 주의: Stop은 세션 종료가 아님 (turn마다). 멱등 합산 필요.
