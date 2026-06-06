# Architecture Decision Records (ADR)

## ADR-001: 모노레포 구조 (npm workspaces)

- **결정**: `apps` + `packages/cli`를 npm workspaces 모노레포로 관리
- **이유**: CLI와 웹이 공유 타입/유틸을 쓸 가능성, 단일 레포로 배포 일관성 확보
- **대안**: 별도 레포 → 공유 코드 관리 복잡도 증가
- **패키지 매니저**: npm 고정 (yarn/pnpm/bun 금지)

## ADR-002: Next.js App Router

- **결정**: Next.js 15 App Router 사용
- **이유**: 현재 공식 표준. Server Components로 DB 쿼리 서버 처리, Route Handlers로 API 구현
- **대안**: Pages Router → 구형 패턴, 새 프로젝트에 부적합

## ADR-003: Supabase Auth + Postgres

- **결정**: Supabase를 인증과 DB 모두에 사용
- **이유**: Auth + Postgres + RLS를 하나의 플랫폼에서 관리. 개인 MVP 속도 최적
- **대안**: NextAuth + 별도 DB → 설정 복잡도 증가

## ADR-004: 린 스타트 데이터 모델

- **결정**: `sessions` + `events`(JSONB) + `token_usage`로 시작 → Phase 7에서 정규화
- **이유**: transcript 형태가 완전히 안정화되기 전에 전체 정규화하면 마이그레이션 비용 증가
- **원칙**: 1.0 동안 원시 데이터는 `events.payload`에 무손실 보관

## ADR-005: 토큰 4컬럼 분리

- **결정**: `token_usage` 테이블에 `input_tokens`, `output_tokens`, `cache_creation_tokens`, `cache_read_tokens` 별도 컬럼
- **이유**: Claude API의 캐시 토큰은 실제 입력 토큰과 다른 요금 체계. 합산 저장 시 분석 불가
- **결과**: Phase 0 스파이크에서 확인한 실측값 기반

## ADR-006: hook runner 비차단 원칙

- **결정**: 이벤트 전송 실패 시 로컬 outbox(`~/.costflow/outbox.sqlite`) 저장 후 exit 0
- **이유**: Claude Code 작업이 hook 실패로 중단되면 안 됨
- **구현**: `costflow flush`로 재전송

## ADR-007: 기본 프롬프트 저장 모드

- **결정**: 기본값 `redacted` (민감정보 마스킹 후 저장)
- **이유**: 기본적으로 서버에 원문 프롬프트 저장하지 않음 (프라이버시 우선)
- **옵션**: `raw` (원문), `metadata_only` (메타데이터만) — opt-in

## ADR-008: API key 저장

- **결정**: DB에 hash 저장 (평문 금지), 발급 시 1회만 평문 노출
- **이유**: 보안 — DB 유출 시 평문 key 노출 방지
- **로컬 저장**: Phase 4에서 결정 (로컬 config 파일 우선, 이후 OS keychain 검토)

## Codex 연동: 파일 스캔 + 4컬럼 토큰 매핑

- **결정**: hook 방식 대신 파일 스캔(폴링)으로 Codex 사용량 수집
- **이유**: Codex Desktop hook 불안정성, CLI·Desktop 모두 `~/.codex/sessions` JSONL을 공유함
- **토큰 매핑**: `input_tokens`→`input_tokens`, `cached_input_tokens`→`cache_read_tokens`, `output_tokens+reasoning_output_tokens`→`output_tokens`, `cache_creation_tokens`=0
- **Codex Cloud(웹)**: 로컬 기록이 없어 범위 제외
