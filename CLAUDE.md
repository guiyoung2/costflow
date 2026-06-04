# CLAUDE.md — Costflow

## 세션 시작 절차 (CRITICAL)

**새 세션을 시작할 때마다 반드시 다음 순서로 읽어라:**

1. `plan/README.md` — 현재 Phase, 진행 상황, 구현 주의사항
2. `fix/README.md` — 버그·수정 이력
3. 이후 작업 진행

각 단계 완료 시:
1. `plan/README.md`의 해당 Phase에 `✅ 완료 (YYYY-MM-DD)` 마킹
2. `fix/README.md`에 `- YYYY-MM-DD · 작업: 요약` 한 줄 추가
3. 사용자에게 보고 후 다음 단계 확인

## CRITICAL (절대 규칙)

- 불확실하면 구현 전에 질문한다.
- 요청 범위 밖 리팩토링·"개선"을 하지 않는다.
- 95% 확신 전에는 변경하지 않는다. 부족하면 질문한다.
- 기능 단위 작업은 `/harness`로 phase/step 계획을 만든 뒤 진행한다.
- 모든 step 파일은 자기완결적이어야 한다 — "이전 대화에서…" 같은 외부 참조 금지.
- **패키지 매니저는 npm만 사용.** yarn, pnpm, bun 절대 금지.

## 프로젝트

- 이름: Costflow
- 설명: 개인용 Claude Code 사용량 분석 대시보드
- 기술 스택: Next.js 15 (App Router), TypeScript strict, Supabase, npm workspaces 모노레포
- 구조: `apps` (Next.js 대시보드/API) + `packages/cli` (Claude Code hook runner)

## 명령어

- 전체 빌드: `npm run build`
- 웹 개발 서버: `npm run dev`
- 웹 빌드: `npm run build:web`
- CLI 빌드: `npm run build:cli`
- 린트: `npm run lint`
- 타입체크: `npm run typecheck`

## 토큰 절약 규칙

- 이미 읽은 파일은 다시 읽지 않는다.
- 도구 호출은 가능한 한 병렬로 실행한다.
- 20줄 이상 분석은 서브에이전트에 위임한다.
- 사용자가 이미 설명한 내용은 반복하지 않는다.
- `@`로 500줄 초과 파일 전체 참조 금지 (필요한 구간·심볼만 지정).

## 코딩 원칙

### 1. 코딩 전에 먼저 생각하라
가정하지 마라. 혼란을 숨기지 마라. 트레이드오프를 드러내라.

- 가정하는 내용을 명시적으로 밝힌다. 불확실하면 질문한다.
- 해석이 여러 가지라면 모두 제시한다 — 조용히 하나를 고르지 않는다.
- 더 단순한 접근법이 있다면 말한다. 필요하면 반대 의견을 낸다.
- 불분명한 부분이 있으면 멈춘다. 무엇이 헷갈리는지 짚고 질문한다.

### 2. 단순함을 우선하라
문제를 해결하는 최소한의 코드만. 추측성 코드는 없다.

- 요청받은 것 이상의 기능을 추가하지 않는다.
- 단일 용도 코드에 추상화를 넣지 않는다.
- 요청받지 않은 "유연성"이나 "설정 가능성"을 넣지 않는다.
- 불가능한 시나리오에 대한 에러 처리는 하지 않는다.

### 3. 외과적으로 변경하라
반드시 필요한 것만 건드린다.

- 인접한 코드, 주석, 포맷을 "개선"하지 않는다.
- 고장나지 않은 것을 리팩토링하지 않는다.
- 무관한 데드 코드를 발견하면 언급하되 삭제하지 않는다.

### 4. 목표 중심으로 실행하라
성공 기준을 정의한다. 검증될 때까지 반복한다.

## Harness 워크플로우

Phase 2부터는 각 Phase를 `/harness`로 실행한다.

```bash
python3 scripts/execute.py {task-name}        # 순차 실행
python3 scripts/execute.py {task-name} --push  # 실행 후 push
```

자세한 워크플로우: `.claude/skills/harness/SKILL.md`

## 참고 문서

- `costflow_plan.md` — 전체 PRD 및 구현 계획 (단일 기준 문서)
- `plan/README.md` — 현재 진행 상황
- `plan/implementation-notes.md` — Phase 0 스파이크 주의사항
- `docs/ARCHITECTURE.md` — 시스템 구조
- `docs/ADR.md` — 기술 결정 기록
