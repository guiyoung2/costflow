# 구현 주의사항 (Phase 0 스파이크 결과)

> Phase 5(Ingestion API) 및 Phase 4(CLI/Hook Runner) 구현 시 반드시 참고.
> 스파이크 전체 결과는 `plan/00-spike.md` 참조.

---

## 1. cache 토큰 4컬럼 분리

### 문제
Transcript의 `record.message.usage`에는 토큰이 **4개 필드**로 분리되어 있다:

```
{
  "input_tokens": 18071,
  "output_tokens": 17779,
  "cache_creation_input_tokens": 111443,
  "cache_read_input_tokens": 1748541
}
```

이 4개를 합산(sum)하면 캐시 토큰이 과다 집계된다.
예: 위 예시에서 합산하면 약 1.9M 토큰으로 잡히지만, 실제 청구 기준은 다르다.

### 해결책
- DB `token_usage` 테이블에 4개를 **별도 컬럼**으로 저장:
  - `input_tokens` (실제 입력)
  - `output_tokens` (실제 출력)
  - `cache_creation_tokens` (캐시 생성)
  - `cache_read_tokens` (캐시 읽기)
- 대시보드에서 표시 목적에 따라 선택적으로 합산 (예: "총 입력" = input + cache_creation + cache_read)
- **절대로 ingestion 시점에 합산해서 하나의 컬럼에 저장하지 말 것**

---

## 2. turn usage 멱등 합산

### 문제
`Stop` 훅은 **응답(turn)이 완료될 때마다** 발생한다. 세션 종료가 아니다.

- 1개 세션 동안 `Stop` 이벤트가 수십 번 발생할 수 있다.
- 각 `Stop`마다 transcript를 파싱하면 **이미 집계된 turn의 usage가 중복으로 합산**된다.

### 해결책
두 가지 접근 중 하나를 선택:

**접근 A — 증분(delta) 방식** (권장)
- 마지막으로 처리한 transcript 레코드의 timestamp 또는 index를 DB에 저장
- 다음 `Stop` 이벤트에서 그 이후 레코드만 파싱해 추가

**접근 B — 전체 재계산 방식**
- `Stop`마다 transcript 전체를 파싱해 세션 usage를 합산
- DB에 `upsert` (session_id 기준)로 덮어씌움
- 구현이 단순하지만 transcript가 길어질수록 파싱 비용 증가

**공통 주의사항**
- `events` 테이블에 `(session_id, turn_index)` 유니크 제약 추가 고려
- `Stop` payload에는 토큰이 없음 — `transcript_path` 파싱 필수

---

## 3. Stop vs SessionEnd

| 이벤트 | 발생 시점 | 용도 |
|--------|-----------|------|
| `Stop` | **응답(turn)마다** | 토큰 파싱, turn 단위 메타데이터 수집 |
| `SessionEnd` | **세션 종료 시 1회** | 세션 마무리, 최종 집계 |

세션 단위 통계(총 토큰, 총 turn 수 등)는 **`SessionEnd`에서** 처리.

---

## 4. hook에 토큰 없음

- hook payload에는 토큰 수가 직접 포함되지 않는다.
- 반드시 `hook_event.transcript_path` → JSONL 파싱 → `record.type === "assistant"` → `record.message.usage` 순서로 추출.
- `transcript_path`가 없거나 파싱 실패 시 `tokenSource = "estimated"` 처리.

---

## 5. subagent JSONL 별도 파일

- subagent 세션은 메인 JSONL과 별도 파일에 기록된다:
  ```
  ~/.claude/projects/<project>/<session-id>/subagents/agent-<id>.jsonl
  ```
- 메인 세션 집계에 subagent 토큰을 포함할지 여부는 Phase 5에서 결정.
- 1.0에서는 "메인 세션만 집계"로 시작하고 subagent는 `unknown` 처리 권장.
