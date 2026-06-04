# Costflow 계획서

> **이 문서는 새 세션 인계용 단일 기준 문서다.** 새 폴더에서 Claude Code를 열면 가장 먼저 이 파일을 읽고 이어서 작업한다.

## 0. 작업 워크플로우 (새 세션 필독)

### 시작 절차

1. 이 `costflow_plan.md`를 새 프로젝트 폴더 루트에 둔다.
2. 첫 작업은 항상 **18장 "구현 Phase 계획"의 Phase 0(스파이크)**부터 시작한다. Phase 0이 통과되지 않으면 토큰/tool/skill 설계 전체가 흔들리므로 선행 게이트다.

### plan / fix 문서 체계 (Phase 1에서 생성)

- **`plan/` 폴더**: 현재 계획과 추후 확장 계획을 담는다. `plan/README.md`(진행 보드 + 현재 단계), `plan/roadmap.md`(1.0/1.5/2.0). 각 Phase 완료 시 해당 항목에 `✅ 완료 (YYYY-MM-DD)` 마킹.
- **`fix/` 폴더**: `fix/README.md`에 개발 중 수정 이력을 기록한다. 세션 작업이 끝나면 `- YYYY-MM-DD · 작업: 요약` 한 줄 추가. 버그는 `원인`·`수정`을 들여쓰기로 기록.
- **`CLAUDE.md`**: "**작업 시작 전 `plan/`과 `fix/`를 먼저 읽어** 진행상황·수정이력을 파악한다", "각 단계 완료 시 ① plan 마킹 ② fix 기록 ③ 사용자 보고 후 다음 단계 확인", "패키지 매니저는 npm만 사용" 규칙을 명시한다.

→ 이 체계 덕분에 어느 새 세션에서든 "지금 어디까지 됐고 무엇이 수정됐는지"를 plan/fix만 읽어 즉시 파악할 수 있다.

### 하네스 (작업 진행 방식)

- 참조
- https://github.com/guiyoung2/harness_framework
- https://github.com/revfactory/harness

`guiyoung2/harness_framework`(Phase→Step→검증 루프)를 베이스로 진행한다. 코드 리뷰·검증이 필요한 Phase(예: 마스킹·ingestion)에만 `revfactory/harness`의 producer-reviewer 패턴을 선택 차용한다. 전체 에이전트 팀 아키텍처는 1인 MVP에 과하므로 쓰지 않는다. (Codex 병행 가능성 + 토큰 절약이 선택 이유)

### 하네스 적용 정책 (어디에 적용하나)

**§18 Phase는 "무엇을 만들지"(불변 로드맵), harness는 "어떻게 실행할지"(step 분해·검증·기록)다. 서로 다른 층위이며 함께 쓴다.**

- **Phase 0(스파이크)·Phase 1(스캐폴드)**: harness 없이 직접 수행. 단발 셋업이라 step 분해 이득이 적다. **Phase 1 안에서 harness 구조를 부트스트랩**한다(아래 순서).
- **Phase 2~7(실제 구현)**: 각 Phase를 `/harness`로 step 분해 → 승인 → 검증 → `phases/`에 기록. Supabase·CLI·마스킹·ingestion처럼 실수가 치명적인 구간에 검증 게이트를 태워 코드 품질을 높이고 누락·할루시네이션을 줄인다.

harness 부트스트랩 순서(Phase 1 내부):

1. harness 구조 복사 → `.claude/`(commands·rules·skills), `docs/`, `scripts/`(execute.py), `.claudeignore`, `CLAUDE.md`.
2. 이 `costflow_plan.md`를 `docs/PRD.md`로 두거나 루트 유지(단일 기준 문서).
3. `plan/`·`fix/` 생성 + `CLAUDE.md`에 "작업 전 plan/fix 선독" 규칙 추가.
4. 이후 Phase 2부터 `/harness Phase N …`으로 실행.

문서 역할 분리(중복 방지): `plan/`=사람이 읽는 로드맵·진행 보드(§18), `phases/`=harness 자동 실행 기록(건드리지 않음), `fix/`=버그·수정 이력, `docs/`=PRD·ARCHITECTURE 설계.

## 1. 프로젝트 요약

-참조: https://github.com/vibemafiaclub/argos / Argos
Costflow는 Argos에서 영감을 받은 개인용 Claude Code 사용량 분석 대시보드다. 1차 버전은 Claude Code만 대상으로 한다. Codex 앱과 Codex CLI 연동은 2차 확장으로 둔다.

목표 흐름은 다음과 같다.

1. 대시보드/API 프로젝트를 Vercel에 배포한다.
2. 인증과 데이터베이스는 Supabase를 사용한다.
3. 사용자는 대시보드에 로그인하고 API key를 발급한다.
4. 추적하고 싶은 Claude Code 프로젝트에서 연결 명령을 실행한다.
5. 연결 명령은 해당 프로젝트의 `.claude/settings.json`에 프로젝트 단위 hook을 등록한다.
6. 이후 Claude Code 사용 이벤트는 자동으로 서버에 전송된다.
7. 대시보드는 프로젝트별 사용량, 세션, 프롬프트, tool 사용량, 가능하면 skill/agent 사용량을 보여준다.

## 2. 현재 확정된 결정

- 범위: 개인용 먼저.
- 1차 연동 대상: Claude Code.
- 2차 연동 대상: Codex 앱, Codex CLI.
- 배포 대상: Vercel.
- 인증/DB: Supabase.
- 데이터 수집 방식: 프로젝트 단위 Claude Code hook.
- 프로젝트 연결 방식: 대시보드에서 API key 발급 후 CLI setup에서 붙여넣기.
- 프롬프트 개선 기능: 1.0에는 제외, 1.5에 추가.
- 마켓플레이스/플러그인 배포: 1.0에는 제외, 로컬/npm CLI 먼저.
- 비용 추정: 선택 기능, 기본 비활성.
- **데이터 모델: 린 스타트(`sessions`+`events`(JSONB)+`token_usage`)로 시작 → Phase 7에서 전체 스키마로 정규화.** 1.0 동안 원시 데이터는 `events.payload`에 무손실 보관.
- **하네스: `guiyoung2/harness_framework` 베이스 + 필요한 Phase에만 `revfactory/harness` producer-reviewer 패턴 차용.**
- **패키지 매니저: npm. 모노레포: npm workspaces(`apps` + `packages/cli`).**
- **작업 워크플로우: `plan/`·`fix/` 폴더 + CLAUDE.md 선독 규칙 (0장 참고).**

## 3. 사용자 경험

### 대시보드 준비

사용자는 Costflow 대시보드/API 프로젝트를 배포하거나 로컬에서 실행한다. 이 대시보드는 연결된 모든 Claude Code 프로젝트를 모아서 보여주는 중앙 화면이다.

현재 이 `costflow_plan.md` 파일은 다음 세션에서 바로 이어가기 위한 단일 기준 문서다. 사용자 경험, 아키텍처, 배포, Supabase, 환경변수, 구현 기준을 이 파일 하나에 모두 담는다.

구현이 시작된 뒤에는 문서를 다음처럼 나눌 수 있다.

- `README.md`: 일반 사용자용 사용 가이드.
- `docs/DEPLOYMENT.md`: Vercel, Supabase, 환경변수, 마이그레이션.
- `docs/ARCHITECTURE.md`: 시스템 구조와 데이터 흐름.
- `docs/PRIVACY.md`: 수집 데이터, 마스킹, 삭제 정책.

단, 지금은 다른 세션이 이 파일 하나만 보고 이어갈 수 있어야 한다.

### 프로젝트 연결

사용자가 추적하고 싶은 Claude Code 프로젝트마다 다음을 한 번 실행한다.

1. Costflow 대시보드에 접속한다.
2. API key를 발급한다.
3. 추적할 Claude Code 프로젝트 폴더로 이동한다.
4. 예를 들어 `costflow init` 명령을 실행한다.
5. API key를 붙여넣는다.
6. CLI가 프로젝트 메타데이터를 만들고 `.claude/settings.json`에 hook을 추가한다.

이후 일반 사용 중에는 수동 데이터 연결 작업이 없어야 한다.

### 평소 사용 흐름

프로젝트가 연결된 뒤에는 다음 흐름으로 동작한다.

1. 사용자는 Claude Code를 평소처럼 사용한다.
2. Claude Code가 설정된 hook을 실행한다.
3. Costflow hook runner가 hook payload를 받는다.
4. hook runner가 프롬프트의 민감정보를 마스킹한다.
5. hook runner가 Costflow API로 이벤트를 전송한다.
6. API가 Supabase에 데이터를 저장한다.
7. 대시보드는 Supabase 데이터를 조회해 화면에 표시한다.

데이터 수집을 위해 대시보드 페이지가 항상 열려 있을 필요는 없다. 대시보드는 사용자가 분석을 보고 싶을 때만 열면 된다.

## 4. 전체 시스템 구조

```text
Claude Code 프로젝트
  .claude/settings.json
  .costflow/project.json
        |
        | Claude Code hook 이벤트
        v
Costflow CLI / Hook Runner
        |
        | HTTPS API 요청
        v
Vercel Next.js API
        |
        | Supabase client
        v
Supabase Postgres + Auth
        |
        | 조회
        v
Vercel Next.js 대시보드
```

## 5. 주요 구성요소

### 웹 대시보드

Next.js로 만들고 Vercel에 배포한다.

주요 화면:

- Home: 최근 사용량과 연결된 프로젝트 요약.
- Projects: 추적 중인 Claude Code 프로젝트 목록.
- Usage: 일/주별, 프로젝트별, 모델별 토큰 사용량 차트.
- Sessions: 세션 타임라인과 turn 단위 상세.
- Prompts: 마스킹된 프롬프트 내역과 사용량 메타데이터.
- Settings: API key, 프롬프트 저장 모드, 마스킹 규칙, 데이터 삭제, 비용 표시 옵션.

### API 서버

Next.js route handler로 Vercel에서 동작한다.

초기 endpoint:

- `POST /api/events`: hook 이벤트 수신.
- `GET /api/projects`: 프로젝트 목록 조회.
- `POST /api/projects`: 프로젝트 생성/연결.
- `GET /api/sessions`: 세션 조회.
- `GET /api/usage`: 사용량 요약 조회.
- `POST /api/api-keys`: API key 생성.
- `DELETE /api/projects/:id`: 프로젝트 데이터 삭제.

### Supabase

Supabase는 다음을 담당한다.

- 사용자 인증.
- Postgres 데이터베이스.
- Row Level Security.
- 향후 export 기능을 위한 storage 선택지.

초기 테이블:

- `profiles`
- `api_keys`
- `projects`
- `project_connections`
- `hook_events`
- `sessions`
- `messages`
- `token_usage`
- `tool_calls`
- `skill_usages`
- `agent_usages`
- `prompt_storage_settings`

### CLI / Hook Runner

CLI는 사용자가 각 Claude Code 프로젝트를 Costflow에 연결할 때 사용한다.

초기 명령:

- `costflow init`: 현재 프로젝트 연결.
- `costflow hook`: Claude Code hook에서 내부적으로 호출되는 명령.
- `costflow status`: 연결 상태 확인.
- `costflow uninstall`: 현재 프로젝트에서 Costflow hook 제거.
- `costflow flush`: 로컬에 쌓인 실패 이벤트 재전송.

hook runner는 빠르고 조용해야 한다. 네트워크나 API가 죽어 있어도 사용자의 Claude Code 작업을 막으면 안 된다.

## 6. Hook 전략

Costflow는 프로젝트 단위 hook을 `.claude/settings.json`에 등록한다.

초기 수집 이벤트:

- `UserPromptSubmit`: 사용자가 제출한 프롬프트 수집.
- `Stop`: 세션 종료 메타데이터 수집, 가능한 경우 transcript에서 사용량 파싱.
- `PreCompact`: 컨텍스트 압축 이벤트 기록.

CLI는 Costflow가 소유한 hook 항목만 수정해야 한다. 기존 Claude Code 설정이나 다른 도구의 hook은 건드리지 않는다.

## 7. 프롬프트 저장과 마스킹

기본 프롬프트 저장 모드는 `redacted`다.

저장 모드:

- `redacted`: 민감정보로 보이는 값을 가린 뒤 프롬프트 저장.
- `raw`: 원문 프롬프트 저장.
- `metadata_only`: 본문 없이 길이, 시간, 프로젝트, 토큰 추정치 같은 메타데이터만 저장.

  1.0 기본 동작:

1. `UserPromptSubmit`에서 프롬프트를 받는다.
2. hook runner에서 로컬로 마스킹 규칙을 적용한다.
3. 마스킹된 프롬프트만 API로 전송한다.
4. Supabase에는 마스킹된 프롬프트를 저장한다.

마스킹 대상 예시:

- API key.
- bearer token.
- `.env` 형태의 secret.
- 긴 secret-like 문자열.
- private key.
- 일반적인 credential 패턴.

원문 저장은 명시적으로 사용자가 켜는 opt-in 설정으로 둔다.

## 8. 토큰과 사용량 전략

토큰 값에는 출처를 반드시 구분한다.

- `actual`: Claude Code transcript 또는 hook에서 실제 토큰 값을 얻은 경우.
- `estimated`: 실제 값을 얻지 못해 prompt/response 내용으로 추정한 경우.
- `unknown`: 사용량을 판단할 수 없는 경우.

1차 분석은 달러 비용보다 토큰 사용량 중심으로 한다.

비용 추정:

- 선택 기능.
- 기본 비활성.
- 저장된 토큰 수와 설정된 모델 가격표를 곱해서 계산.
- 추가 LLM 호출이 필요하지 않다.

현재 사용자가 Claude Pro 고정 요금제를 쓰고 있으므로 1.0 핵심은 비용보다 토큰 사용량, 세션별 사용 패턴, 프롬프트 길이, 컨텍스트 압축 빈도다.

## 9. Tool, Skill, Agent 추적

1.0에서는 가능한 경우 tool call 이름과 기본 메타데이터를 저장한다.

skill/agent 사용량은 schema에는 열어두되, Claude Code transcript 형태가 항상 안정적이지 않을 수 있으므로 화면에는 “감지 가능한 경우 표시”로 둔다.

초기 동작:

- tool call 이름, timestamp, session, project 저장.
- transcript 또는 tool metadata에서 skill/agent 사용 흔적 추출 시도.
- 안정적으로 알 수 없으면 `unknown` 처리.

## 10. 신뢰성

hook runner는 대시보드 페이지가 열려 있지 않아도 동작해야 한다.

이벤트 업로드 실패 시:

1. 이벤트를 로컬 outbox에 저장한다.
2. Claude Code 작업이 막히지 않도록 성공 종료한다.
3. 다음 hook 실행 또는 `costflow flush` 실행 시 재전송한다.

예상 outbox 위치:

```text
~/.costflow/outbox.sqlite
```

프로젝트 로컬 설정에는 secret이 아닌 프로젝트 메타데이터만 저장한다.

```text
.costflow/project.json
```

API key 같은 secret은 가능하면 사용자 로컬 설정 또는 OS keychain에 저장한다. 1차에서는 단순 로컬 config로 시작할 수 있지만, 평문 저장 위험은 문서화해야 한다.

## 11. 보안과 프라이버시

1.0 필수 항목:

- hook ingestion용 API key 인증.
- 사용자가 자기 데이터만 읽을 수 있도록 Supabase RLS 적용.
- 기본 프롬프트 저장은 redacted.
- 프로젝트 단위 데이터 삭제.
- 가능하면 세션 단위 삭제.
- 어떤 데이터가 수집되는지 명확히 설명.

기본값으로 원문 프롬프트를 서버에 저장하지 않는다.

## 12. 배포와 환경 계획

이 섹션은 다음 세션에서 바로 이어가기 위해 이 단일 계획 파일 안에 유지한다.

### Vercel

Costflow는 Next.js 프로젝트로 Vercel에 배포한다.

Vercel의 역할:

- 대시보드 UI 제공.
- API route handler 호스팅.
- 연결된 Claude Code 프로젝트에서 hook 이벤트 수신.
- 인증된 대시보드 요청에 대해 Supabase 데이터 조회.

예상 Vercel 환경변수:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COSTFLOW_API_KEY_PEPPER`
- `COSTFLOW_ENCRYPTION_KEY` encrypted secret 기능을 넣는 경우

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 절대 브라우저에 노출하면 안 된다.
- 브라우저 코드는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`만 사용한다.
- API route는 서버에서만 service role key를 사용할 수 있다.

### Supabase

Supabase는 Auth와 Postgres를 담당한다.

초기 설정:

1. Supabase 프로젝트를 만든다.
2. 처음에는 email auth를 활성화한다.
3. GitHub OAuth는 나중에 추가해도 된다.
4. migration으로 DB 테이블을 만든다.
5. 사용자 소유 테이블에는 RLS를 켠다.
6. 사용자가 자기 프로젝트와 이벤트만 읽고 삭제할 수 있도록 policy를 만든다.

핵심 테이블:

- `profiles`
- `api_keys`
- `projects`
- `project_connections`
- `hook_events`
- `sessions`
- `messages`
- `token_usage`
- `tool_calls`
- `skill_usages`
- `agent_usages`
- `prompt_storage_settings`

API key는 평문 저장하지 않고 hash로 저장한다.

### 로컬 개발 흐름

예상 로컬 개발 순서:

1. Supabase local을 실행하거나 hosted Supabase dev 프로젝트를 사용한다.
2. `.env.example`을 `.env.local`로 복사한다.
3. Supabase URL과 key를 입력한다.
4. DB migration을 실행한다.
5. Next.js dev server를 실행한다.
6. CLI를 로컬 build 또는 link한다.
7. 테스트용 Claude Code 프로젝트에서 `costflow init`을 실행한다.

### 나중 문서 분리

레포가 만들어진 뒤에는 문서를 다음처럼 분리한다.

- `README.md`: 일반 사용자용 사용 가이드.
- `docs/DEPLOYMENT.md`: Vercel, Supabase, 환경변수, migration.
- `docs/ARCHITECTURE.md`: 시스템 설계와 데이터 흐름.
- `docs/PRIVACY.md`: 데이터 수집, 마스킹, 삭제.

하지만 그 파일들이 생기기 전까지는 이 `costflow_plan.md` 하나에 모든 내용이 있어야 한다.

## 13. 사용자 문서 계획

메인 README는 사용자 관점에 집중한다.

- Costflow가 무엇을 하는지.
- CLI 설치 방법.
- Claude Code 프로젝트 연결 방법.
- 어떤 데이터가 수집되는지.
- 대시보드 보는 방법.
- 추적 비활성화/제거 방법.
- 프롬프트 마스킹이 어떻게 동작하는지.

Vercel 배포, Supabase 설정, 환경변수는 일반 사용자 README 전면에 두지 않는다. 이 내용은 개발자/운영자 문서에 둔다.

## 14. 버전 로드맵

### 1.0 MVP

- 개인 계정.
- Vercel 대시보드/API.
- Supabase Auth/Postgres.
- API key 기반 프로젝트 연결.
- CLI `init`, `status`, `hook`, `uninstall`, `flush`.
- Claude Code 프로젝트 단위 hook 설치.
- `UserPromptSubmit`, `Stop`, `PreCompact` 수집.
- 기본 redacted 프롬프트 저장.
- 프로젝트/세션/토큰/tool 분석.
- 업로드 실패를 위한 로컬 outbox.

### 1.5

- 프롬프트 개선 분석.
- 선택적 LLM 기반 프롬프트 rewrite 제안.
- 프롬프트 패턴 감지.
- skill/agent 사용량 리포트 개선.
- CSV/JSON export.

### 2.0

- Codex CLI 연동.
- 가능하다면 Codex 앱 명시적 logging 연동.
- 마켓플레이스/플러그인 패키징.
- 필요 시 팀/조직 기능.
- 고급 비용 리포트.

## 15. 열린 질문

- Claude Code transcript에서 토큰 사용량, tool, skill metadata가 정확히 어떤 형태로 나오는지 구현 중 검증해야 한다.
- Windows에서 API key를 어디에 저장할지 결정해야 한다. 1차는 로컬 config, 이후 OS keychain 검토.
- CLI 패키지 이름을 `costflow`, `costflow-ai` 등 무엇으로 할지 npm 가용성 확인이 필요하다.
- 프로젝트 연결 방식을 나중에 API key copy/paste에서 browser OAuth로 바꿀지 검토할 수 있다.

## 16. 성공 기준

1. 사용자가 대시보드에 로그인할 수 있다.
2. 사용자가 API key를 발급할 수 있다.
3. 사용자가 한 번의 setup 명령으로 Claude Code 프로젝트를 연결할 수 있다.
4. setup 명령이 프로젝트 단위 Claude Code hook을 등록한다.
5. 새 Claude Code 프롬프트가 자동으로 API에 전송된다.
6. 이벤트가 올바른 사용자와 프로젝트 아래 Supabase에 저장된다.
7. 대시보드가 프로젝트별 사용량 요약을 보여준다.
8. 대시보드가 세션과 프롬프트 타임라인을 보여준다.
9. 프롬프트는 기본적으로 redacted 상태로 저장된다.
10. 업로드 실패가 Claude Code 사용을 방해하지 않는다.
11. 사용자가 프로젝트 hook을 제거할 수 있다.
12. 사용자가 수집된 프로젝트 데이터를 삭제할 수 있다.

## 17. ⚠️ 선행 게이트 (가장 큰 리스크)

**토큰·tool·skill 데이터를 실제로 얻을 수 있는가가 최대 리스크다.** hook payload는 토큰 수를 직접 주지 않는다 — 실제 값은 `~/.claude/projects/.../*.jsonl` transcript에 있고, hook은 `transcript_path`만 넘긴다. 또한 `Stop`은 "세션 종료"가 아니라 **응답(turn)마다** 발생하며, 세션 단위는 `SessionEnd`다. (6장의 `Stop` 설명은 이 점을 반영해 구현 시 재확인한다.)

→ 구현 0번 작업으로 **Phase 0 스파이크**를 먼저 수행하고, 통과 후에만 본 구현에 진입한다. AGENTS 지침대로 hook 이벤트 시맨틱은 추측하지 말고 현재 Claude Code 문서로 확인한다.

## 18. 구현 Phase 계획

### Phase 0 — 스파이크 (선행 게이트)

- 0-1: 현재 hooks 문서로 `UserPromptSubmit`/`Stop`/`SessionEnd`/`PreCompact`의 payload 스키마·발생 시점 재확인 → `plan/00-spike.md`에 필드 목록 기록.
- 0-2: 실제 transcript JSONL 파싱으로 model / input·output·cache 토큰 / tool call / (가능 시) skill·agent 흔적 추출 PoC.
- **게이트**: `actual` 토큰 1건 이상 추출 + 출처(`actual`/`estimated`/`unknown`) 판정 로직 통과해야 다음 진행.

### Phase 1 — 스캐폴드 + 워크플로우 문서

- npm workspaces 모노레포(`apps`, `packages/cli`).
- `plan/`·`fix/` 폴더 + `CLAUDE.md`(0장 규칙) 생성.
- 검증: `npm install` 성공, web dev 기동, cli 빌드 성공.

### Phase 2 — Supabase (린 스키마 + Auth + RLS)

- email auth. migration으로 린 스키마만: `profiles`, `api_keys`(hash+prefix), `projects`, `sessions`, `events`(type+`payload jsonb`+token_source), `token_usage`, `prompt_storage_settings`.
- 전 테이블 RLS on + "자기 데이터만 read/delete".
- 검증: 마이그레이션 적용, RLS 격리 테스트 통과.

### Phase 3 — 대시보드/API 베이스

- Supabase Auth 로그인, `POST /api/api-keys`(발급 시 평문 1회 노출, DB엔 hash), Settings에서 key 관리.
- 검증: 성공 기준 1·2.

### Phase 4 — CLI / Hook Runner

- `init`/`hook`/`status`/`uninstall`/`flush`. `.claude/settings.json`에 **Costflow 소유 hook만** 추가(기존 불변).
- 신뢰성: 실패 시 `~/.costflow/outbox.sqlite` 적재 후 성공 종료(작업 비차단) → 재전송. 성능: `hook`은 최소 로직, 무거운 파싱은 지연.
- 검증: 성공 기준 3·4·10·11.

### Phase 5 — Ingestion API + 마스킹

- `POST /api/events`(API key 인증) → `events`/`sessions`/`token_usage` 기록, Phase 0 파서로 토큰 출처 태깅.
- 마스킹은 hook runner 로컬에서(기본 `redacted`, `raw`/`metadata_only`는 opt-in).
- 검증: 성공 기준 5·6·9.

### Phase 6 — 대시보드 화면

- Home/Projects/Usage/Sessions/Prompts/Settings. 프로젝트·세션 단위 삭제, 비용은 선택·기본 비활성.
- 검증: 성공 기준 7·8·12.

### Phase 7 — 전체 스키마 정규화 (린 → 풀)

- transcript 형태 안정화 후 `events.payload`에서 백필하며 `messages`·`tool_calls`·`skill_usages`·`agent_usages` 정규화. 불확실하면 `unknown`.
- 검증: 무손실 마이그레이션 + 화면에 tool/skill/agent 집계 추가.

### 확장 (plan/roadmap.md)

- 1.5: 프롬프트 개선·rewrite 제안(opt-in LLM), 패턴 감지, skill/agent 리포트 강화, CSV/JSON export.
- 2.0: Codex CLI/앱 연동(`costflow hook --agent codex` 분기), 마켓플레이스 패키징, 팀 기능, 고급 비용 리포트.

### 종단 검증 (1.0 완료 판정)

Supabase 구성 → 로그인 → API key 발급 → 테스트 프로젝트에서 `costflow init`(hook 등록 확인) → Claude Code 1턴 사용(redacted 저장 확인) → 대시보드 표시 확인 → 네트워크 차단 시 비차단 + outbox + `flush` 재전송 확인 → 삭제·`uninstall` 확인 → **성공 기준 1~12 전체 통과.**
