# Harness 워크플로우 스킬

이 프로젝트는 Harness 프레임워크를 사용한다. 기능 단위·리스크가 큰 작업은 phase/step으로 쪼개 계획·실행·검증·기록한다.

## Claude Code 사용자

`/harness` 슬래시 커맨드를 사용한다.

## 워크플로우 요약

**A. 탐색** — `docs/` 하위 문서(PRD, ARCHITECTURE, ADR)를 읽고 프로젝트의 기획·아키텍처·설계 의도를 파악한다.

**B. 논의** — 구현을 위해 결정해야 할 사항이 있으면 사용자에게 제시하고 논의한다.

**C. Step 설계** — 여러 step으로 나뉜 초안을 작성해 피드백을 요청한다. 설계 원칙:

1. **Scope 최소화** — 하나의 step = 하나의 레이어 또는 모듈
2. **자기완결성** — 각 step 파일은 독립된 세션에서 실행된다. 외부 참조 금지.
3. **사전 준비 강제** — 관련 문서 경로와 이전 step 산출물 경로를 명시한다.
4. **시그니처 수준 지시** — 인터페이스만 제시하고 구현은 에이전트 재량에 맡긴다.
5. **AC는 실행 가능한 커맨드** — `npm run build && npm test` 같은 실제 커맨드를 포함한다.
6. **주의사항은 구체적으로** — "X를 하지 마라. 이유: Y" 형식으로 적는다.
7. **네이밍** — kebab-case slug (예: `project-setup`, `api-layer`)

**D. 파일 생성** — 승인 후 아래 파일들을 생성한다.

- `phases/index.json` — 전체 phase 현황
- `phases/{task}/index.json` — task 상세 (step 목록, 초기 status: "pending")
- `phases/{task}/step{N}.md` — 각 step 지시 파일
- `phases/{task}/feature_list.json` — 조기 종료 방지 게이트
- `phases/{task}/progress.md` — 세션 간 인수인계 문서 (뼈대만, execute.py가 자동 갱신)

**E. 실행** — feature_list.json의 feature 목록이 완료 기준을 모두 포함하는지 사용자에게 확인 후 실행한다.

```bash
python3 scripts/execute.py {task-name}        # 순차 실행
python3 scripts/execute.py {task-name} --push  # 실행 후 push
```

## 절대 수정 금지

- `scripts/` 디렉토리 내 모든 파일 (execute.py 포함)
- `harness.config.json`

## 템플릿 파일 위치

- Step 지시 파일: `.claude/skills/harness/templates/step.md`
- Phase index: `.claude/skills/harness/templates/phase-index.json`
- Top index: `.claude/skills/harness/templates/top-index.json`
- Progress: `.claude/skills/harness/templates/progress.md`
- Feature list: `.claude/skills/harness/templates/feature_list.json`
