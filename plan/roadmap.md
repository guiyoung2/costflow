# Costflow 로드맵

## 1.0 MVP

- 개인 계정 (Supabase Auth)
- Vercel 대시보드/API (Next.js 15 App Router)
- Supabase Postgres + RLS
- API key 기반 프로젝트 연결
- CLI: `init`, `status`, `hook`, `uninstall`, `flush`
- Claude Code 프로젝트 단위 hook 설치 (`UserPromptSubmit`, `Stop`, `SessionEnd`, `PreCompact`)
- 기본 redacted 프롬프트 저장
- 프로젝트/세션/토큰/tool 분석 대시보드
- 업로드 실패 시 로컬 outbox (`~/.costflow/outbox.sqlite`) + `flush` 재전송

성공 기준: `costflow_plan.md` §16 참조 (1~12번 모두 통과)

## 1.5

- 프롬프트 개선 분석 (opt-in)
- 선택적 LLM 기반 프롬프트 rewrite 제안
- 프롬프트 패턴 감지
- skill/agent 사용량 리포트 강화
- CSV/JSON export

## 2.0

- Codex CLI 연동 (`costflow hook --agent codex` 분기)
- 가능하면 Codex 앱 명시적 logging 연동
- 마켓플레이스/플러그인 패키징
- 필요 시 팀/조직 기능
- 고급 비용 리포트
