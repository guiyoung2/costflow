# Costflow

개인용 Claude Code 사용량 분석 대시보드. Claude Code 프로젝트에 hook을 등록하면 세션·토큰·tool 사용 데이터를 자동 수집하고, 웹 대시보드에서 한눈에 볼 수 있습니다.

## 주요 기능

- **자동 수집** — Claude Code hook이 프롬프트·세션·토큰 데이터를 백그라운드에서 전송
- **토큰 분석** — input / output / cache_creation / cache_read 4종 토큰 컬럼 분리 집계
- **세션 타임라인** — 세션별·프로젝트별 사용 패턴 조회
- **프롬프트 마스킹** — API key, secret 등 민감정보를 로컬에서 마스킹 후 전송 (기본 `redacted` 모드)
- **비차단 신뢰성** — 전송 실패 시 로컬 outbox에 저장 후 재시도, Claude Code 작업을 막지 않음
- **Codex 연동** — `costflow sync`로 Codex CLI/Desktop 세션 파일도 동일 대시보드에서 조회

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript strict |
| 인증 / DB | Supabase Auth + Postgres + RLS |
| 배포 | Vercel |
| CLI | Node.js + TypeScript |
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

## 시작하기

### 사전 준비

- Node.js 18 이상
- [Supabase](https://supabase.com) 프로젝트 (무료 플랜 가능)
- (배포 시) [Vercel](https://vercel.com) 계정

### 1. 저장소 클론 및 의존성 설치

```bash
git clone https://github.com/guiyoung2/costflow.git
cd costflow
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example apps/.env.local
```

`apps/.env.local`을 열고 값을 채웁니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> Supabase 대시보드 → Project Settings → API에서 URL과 키를 복사하세요.  
> `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용입니다. 절대 브라우저에 노출하지 마세요.

### 3. Supabase 마이그레이션 적용

Supabase CLI 또는 대시보드 SQL 편집기에서 `apps/supabase/migrations/` 폴더의 `.sql` 파일을 순서대로 실행합니다.

```bash
# Supabase CLI를 사용하는 경우
supabase db push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 랜딩 페이지가 표시됩니다.

---

## Claude Code 프로젝트 연결

### 1. 대시보드 로그인 및 API key 발급

1. `http://localhost:3000`에 접속해 계정을 만들거나 로그인합니다.
2. **Settings** 페이지에서 API key를 발급합니다. 발급 직후에만 전체 키가 표시됩니다.

### 2. CLI 빌드

```bash
npm run build:cli
```

### 3. 추적할 Claude Code 프로젝트에서 초기화

```bash
cd /path/to/your-claude-project
node /path/to/costflow/packages/cli/dist/index.js init
```

> npm에 글로벌 publish된 경우: `costflow init`

초기화 과정에서 API key를 붙여넣으면 `.claude/settings.json`에 hook이 등록됩니다.

### 4. 확인

```bash
costflow status   # 연결 상태 확인
```

이후 해당 프로젝트에서 Claude Code를 사용하면 데이터가 자동으로 대시보드에 수집됩니다.

---

## Codex 사용량 연동

Codex CLI / Desktop의 세션 파일(`~/.codex/sessions/`)을 스캔해 같은 대시보드로 전송합니다.

```bash
costflow sync          # 수동 동기화
```

OS 스케줄러(cron / Task Scheduler)에 등록하면 자동 실행됩니다.

---

## CLI 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `costflow init` | 현재 프로젝트에 hook 등록 |
| `costflow status` | 연결 상태 확인 |
| `costflow sync` | Codex 세션 파일 수동 동기화 |
| `costflow flush` | 실패한 이벤트 재전송 |
| `costflow uninstall` | 현재 프로젝트에서 hook 제거 |

---

## 대시보드 화면

| 경로 | 내용 |
|------|------|
| `/dashboard` | 최근 사용량 요약 및 프로젝트 개요 |
| `/projects` | 연결된 Claude Code 프로젝트 목록 |
| `/usage` | 일/주별, 프로젝트별, 모델별 토큰 차트 |
| `/sessions` | 세션 타임라인과 turn 단위 상세 |
| `/prompts` | 마스킹된 프롬프트 내역 |
| `/settings` | API key 관리, 마스킹 규칙, 데이터 삭제 |

---

## Vercel 배포

1. Vercel에서 이 저장소를 import합니다.
2. **Root Directory**를 `apps`로 설정합니다.
3. 환경변수를 추가합니다.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

4. 배포 후 `apps/.env.local`의 URL을 Vercel 도메인으로 업데이트하고 CLI를 재설정합니다.

---

## 프롬프트 저장 모드

| 모드 | 동작 |
|------|------|
| `redacted` (기본) | 민감정보 마스킹 후 저장 |
| `metadata_only` | 길이·시간·토큰 메타데이터만 저장 |
| `raw` | 원문 저장 (opt-in, 명시적으로 설정 필요) |

마스킹은 서버 전송 전 **로컬에서** 적용됩니다.

---

## 개발 명령어

```bash
npm run dev          # 웹 개발 서버
npm run build        # 전체 빌드 (웹 + CLI)
npm run build:web    # 웹만 빌드
npm run build:cli    # CLI만 빌드
npm run lint         # ESLint
npm run typecheck    # TypeScript 타입 검사
```

---

## 라이선스

MIT
