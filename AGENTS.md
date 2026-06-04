# CRITICAL (절대 규칙)

- 불확실하면 구현 전에 질문한다.
- 요청 범위 밖 리팩토링·"개선"을 하지 않는다.
- 95% 확신 전에는 변경하지 않는다. 부족하면 질문한다.
- 기능 단위 작업은 harness로 phase/step 계획을 만든 뒤 진행한다.
- 모든 step 파일은 자기완결적이어야 한다 — "이전 대화에서…" 같은 외부 참조 금지.
- **패키지 매니저는 npm만 사용.** yarn, pnpm, bun 절대 금지.

# 프로젝트

- 이름: Costflow
- 설명: 개인용 Claude Code 사용량 분석 대시보드 (Next.js + Supabase)
- 기술 스택: Next.js 15 App Router, TypeScript strict, Supabase Auth/Postgres, npm workspaces
- 구조: monorepo — `apps` (대시보드/API) + `packages/cli` (hook runner)

# 명령어

- 전체 빌드: `npm run build`
- 웹 개발 서버: `npm run dev`
- 웹 빌드: `npm run build:web`
- CLI 빌드: `npm run build:cli`
- 린트: `npm run lint`
- 타입체크: `npm run typecheck`

# 보안 규칙

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 코드(`app/api/`)에서만 사용. 클라이언트 노출 절대 금지.
- API key는 평문 저장 금지. 항상 hash 후 저장.
- `.env.local`은 커밋 금지.

# 토큰 절약 규칙

- 이미 읽은 파일은 다시 읽지 않는다.
- 도구 호출은 가능한 한 병렬로 실행한다.
- 20줄 이상 분석은 서브에이전트에 위임한다.
- 사용자가 이미 설명한 내용은 반복하지 않는다.
- `@`로 500줄 초과 파일 전체 참조 금지 (필요한 구간·심볼만 지정).
