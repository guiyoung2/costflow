# Costflow

개인용 Claude Code 사용량 분석 대시보드. Claude Code 프로젝트에 hook을 등록하면 세션·토큰·tool 사용 데이터를 자동 수집하고, 웹 대시보드에서 한눈에 볼 수 있습니다.

## 주요 기능

- **자동 수집** — Claude Code hook이 프롬프트·세션·토큰 데이터를 백그라운드에서 전송
- **토큰 분석** — input / output / cache_creation / cache_read 4종 토큰 컬럼 분리 집계
- **세션 타임라인** — 세션별·프로젝트별 사용 패턴 조회
- **프롬프트 마스킹** — API key, secret 등 민감정보를 로컬에서 마스킹 후 전송 (기본 `redacted` 모드)
- **비차단 신뢰성** — 전송 실패 시 로컬 outbox에 저장 후 재시도, Claude Code 작업을 막지 않음
- **Codex 연동** — `costflow sync`로 Codex CLI/Desktop 세션 파일도 동일 대시보드에서 조회

## Quick Start

```bash
# 1. CLI 전역 설치 (한 번만)
npm install -g @guiyoung2/costflow
```

```bash
# 2. 추적할 Claude Code 프로젝트 연결
cd /path/to/your-claude-project
costflow init
# → Base URL: https://costflow-seven.vercel.app
# → API key: 대시보드 Settings 페이지에서 발급
```

이후 Claude Code를 평소처럼 사용하면 데이터가 자동으로 대시보드에 수집됩니다.

> 대시보드: **https://costflow-seven.vercel.app**

## 작동 방식

1. `costflow init`을 실행하면 `.claude/settings.json`에 hook이 등록되고, `.costflow/project.json`에 프로젝트 메타데이터가 저장됩니다.

2. Claude Code가 hook을 실행하면 `costflow hook`이 호출됩니다. hook runner는 transcript를 파싱해 토큰·tool·세션 데이터를 추출하고, 프롬프트의 민감정보를 로컬에서 마스킹한 뒤 API로 전송합니다.

3. 전송 실패 시에는 `~/.costflow/outbox.sqlite`에 이벤트를 보관하고 성공 종료합니다. Claude Code 작업을 막지 않으며, 다음 hook 실행 또는 `costflow flush` 시 재전송합니다.

4. 대시보드(`/dashboard`)에서 프로젝트별 토큰 사용량, 세션 타임라인, 마스킹된 프롬프트 내역을 조회합니다.

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript strict |
| 인증 / DB | Supabase Auth + Postgres + RLS |
| 배포 | Vercel (https://costflow-seven.vercel.app) |
| CLI | Node.js + TypeScript (`@guiyoung2/costflow`) |
| 로컬 outbox | better-sqlite3 |
| 패키지 매니저 | npm workspaces |

## 모노레포 구조

```
costflow/
├── apps/          # Next.js 15 대시보드 + API route
└── packages/
    └── cli/       # costflow CLI (hook runner)
```

---

## CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `costflow init` | 현재 프로젝트에 hook 등록 |
| `costflow status` | 연결 상태 확인 |
| `costflow sync` | Codex 세션 파일 수동 동기화 |
| `costflow flush` | 실패한 이벤트 재전송 |
| `costflow uninstall` | 현재 프로젝트에서 hook 제거 |

## 대시보드 화면

| 경로 | 내용 |
|------|------|
| `/dashboard` | 최근 사용량 요약 및 프로젝트 개요 |
| `/projects` | 연결된 Claude Code 프로젝트 목록 |
| `/usage` | 일/주별, 프로젝트별, 모델별 토큰 차트 |
| `/sessions` | 세션 타임라인과 turn 단위 상세 |
| `/prompts` | 마스킹된 프롬프트 내역 |
| `/settings` | API key 관리, 마스킹 규칙, 데이터 삭제 |

## Codex 사용량 연동

Codex CLI / Desktop의 세션 파일(`~/.codex/sessions/`)을 스캔해 같은 대시보드로 전송합니다.

```bash
costflow sync          # 수동 동기화
```

OS 스케줄러(cron / Task Scheduler)에 등록하면 자동 실행됩니다.

---

## 프롬프트 저장 모드

| 모드 | 동작 |
|------|------|
| `redacted` (기본) | 민감정보 마스킹 후 저장 |
| `metadata_only` | 길이·시간·토큰 메타데이터만 저장 |
| `raw` | 원문 저장 (opt-in, 명시적으로 설정 필요) |

마스킹은 서버 전송 전 **로컬에서** 적용됩니다.

---

## 라이선스

MIT
