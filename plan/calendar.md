# 다음 세션 작업 계획

이 파일을 읽고 아래 작업들을 순서대로 진행한다.
절대 규칙: 각 작업 완료 후 `npm run typecheck` 통과 확인 후 다음 작업으로 넘어간다.

---

## 현재 프로젝트 상태

- **기술 스택**: Next.js 15 App Router, TypeScript strict, Supabase, npm workspaces
- **패키지 매니저**: npm만 사용 (yarn/pnpm/bun 금지)
- **앱 경로**: `apps/src/app/(dashboard)/`
- **API 경로**: `apps/src/app/api/`

### 관련 파일 목록

| 파일 | 역할 |
|------|------|
| `apps/src/app/(dashboard)/prompts/page.tsx` | Prompts 페이지 (그리드↔리스트 2-view) |
| `apps/src/app/(dashboard)/sessions/page.tsx` | Sessions 페이지 (현재: 단순 테이블) |
| `apps/src/app/(dashboard)/usage/page.tsx` | Usage 페이지 (월 네비게이션, 차트 등) |
| `apps/src/app/(dashboard)/projects/page.tsx` | Projects 페이지 (프로젝트 목록 테이블) |
| `apps/src/app/(dashboard)/dashboard/page.tsx` | Home 대시보드 (최근 프로젝트 테이블) |
| `apps/src/app/api/prompts/route.ts` | 프롬프트 목록 API (`project_id`, `days` 파라미터) |
| `apps/src/app/api/sessions/route.ts` | 세션 목록 API (`project_id`, `agent` 파라미터) |
| `apps/src/app/api/usage/route.ts` | 사용량 API (`year`, `month`, `project_id`, `agent`) |

---

## 작업 1 — Prompts 페이지 달력 날짜 필터

### 현재 상태
`apps/src/app/(dashboard)/prompts/page.tsx` 의 리스트 뷰(list view)에 날짜 필터가 버튼 형태로 있음:
- 오늘 / 7일 / 30일 / 전체 (4개 버튼)
- `days` 값을 `/api/prompts?days=N` 에 전달하는 구조
- 상태: `const [days, setDays] = useState<DaysValue>(null)` (null = 전체)

### 목표
버튼 필터를 **달력 날짜 피커**로 교체:
- 특정 날짜를 선택하면 그날의 프롬프트만 표시
- 해당 프로젝트(또는 전체)에 프롬프트 데이터가 없는 날짜는 **클릭 불가(disabled)**
- "전체" 버튼은 달력 옆에 별도로 남겨둠 (선택 해제 = 전체 보기)
- 라이브러리: `react-day-picker` 설치 필요

### 구현 단계

#### Step 1: 라이브러리 설치
```bash
cd apps && npm install react-day-picker
```
`react-day-picker`는 CSS를 별도 import 해야 함:
```ts
import "react-day-picker/dist/style.css";
```
단, 다크 테마와 충돌할 수 있으므로 CSS import 후 override 필요.

#### Step 2: 새 API 엔드포인트 생성
파일: `apps/src/app/api/prompts/available-dates/route.ts`

역할: 특정 프로젝트(또는 전체)에서 프롬프트 데이터가 존재하는 날짜 목록 반환

```ts
// GET /api/prompts/available-dates?project_id=xxx
// 응답: { dates: ["2026-06-04", "2026-06-05", ...] }
```

구현 방법:
- `events` 테이블에서 `type = 'UserPromptSubmit'` 인 `created_at` 컬럼의 날짜(YYYY-MM-DD)만 distinct로 가져옴
- `project_id` 가 있으면 `sessions` 테이블 JOIN 후 필터
- Supabase 쿼리 예시:
  ```ts
  // project_id 없는 경우 (전체)
  supabase.from("events").select("created_at").eq("type", "UserPromptSubmit")
  // 결과에서 .slice(0, 10) 으로 날짜 추출, Set으로 중복 제거
  
  // project_id 있는 경우
  // sessions where project_id = X → session IDs
  // events where session_id IN [...] AND type = UserPromptSubmit
  ```

#### Step 3: Prompts 페이지 수정
`apps/src/app/(dashboard)/prompts/page.tsx`

변경 사항:
1. `days` 상태 → `selectedDate: Date | null` 상태로 교체
2. `availableDates: Date[]` 상태 추가 (달력에서 활성화할 날짜들)
3. 리스트 진입 시 `/api/prompts/available-dates?project_id=X` 호출하여 `availableDates` 세팅
4. 달력 UI 추가 (DayPicker 컴포넌트)
5. API 호출: `days` 파라미터 대신 `date=2026-06-10` 형식으로 전달

#### Step 4: `/api/prompts/route.ts` 수정
현재 `days` 파라미터 처리 로직 옆에 `date` 파라미터 처리 추가:
```ts
const dateParam = searchParams.get("date"); // "2026-06-10" 형식
if (dateParam) {
  const dayStart = new Date(dateParam);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dateParam);
  dayEnd.setHours(23, 59, 59, 999);
  query = query.gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString());
}
```

### 달력 스타일링 주의사항
- 프로젝트 디자인: 다크 테마 (`#060a0e` 배경, `#0d1117` 카드, `#22d3ee` 브랜드 색상)
- `react-day-picker` 기본 CSS는 라이트 테마 → CSS variables override 필요
- 또는 CSS import 없이 `classNames` prop으로 완전 커스텀 가능
- 추천: `classNames` prop 사용하여 Tailwind 클래스로 완전 커스텀

---

## 작업 2 — Sessions 페이지 프로젝트 카드 형식 재설계

### 현재 상태
`apps/src/app/(dashboard)/sessions/page.tsx`: 전체 세션을 하나의 테이블로 표시.
필터: Agent(전체/Claude Code/Codex) + 프로젝트 드롭다운.

### 목표
**Prompts 페이지와 동일한 2-view 구조**로 재설계:
- **Grid view** (초기 화면): 프로젝트 카드들 + "전체 세션" 카드
  - 각 카드: 프로젝트명, 세션 수, 마지막 활동일
  - 카드 클릭 → List view 진입
- **List view** (세션 목록): 선택한 프로젝트의 세션 상세 목록
  - `← 목록` 버튼으로 그리드로 복귀
  - Agent 필터 (전체/Claude Code/Codex) 유지
  - 세션별: 모델명, 시작 시각, turn 수, 총 토큰, Tool 호출 수

### 참고 — Prompts 페이지 패턴
`apps/src/app/(dashboard)/prompts/page.tsx` 의 구조를 그대로 따름:
```ts
const [view, setView] = useState<"grid" | "list">("grid");
const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
const [selectedProjectName, setSelectedProjectName] = useState<string>("");
```

### 세션 데이터 구조 (Session 타입)
`/api/sessions` 응답의 Session 객체:
```ts
{
  id: string;
  session_id_ext: string;
  project_id: string;
  project_name: string;   // JOIN된 프로젝트명
  model: string | null;
  started_at: string;
  ended_at: string | null;
  turn_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_creation_tokens: number;
  total_cache_read_tokens: number;
  tool_call_count: number;
  agent: string;
}
```

### Grid view 카드 표시 정보
프로젝트 목록은 `/api/projects` 에서 가져옴. Project 타입:
```ts
{
  id: string;
  name: string;
  session_count: number;
  last_active_at: string | null;
  created_at: string;
}
```

### List view 세션 행 표시 정보
각 세션 행:
- 모델명 (`model` 또는 "—")
- Agent 뱃지 (claude → "Claude", codex → "Codex")
- 시작 시각 (`started_at`)
- Turn 수 (`turn_count`)
- Input 토큰 (`total_input_tokens`)
- Tool 호출 수 (`tool_call_count`)

### 현재 sessions 페이지에서 "CC" → "Claude" 변경 이미 완료됨
`s.agent === "codex" ? "Codex" : "Claude"` 로 이미 수정되어 있음.

---

## 작업 3 — 네비게이션 변경 (Home + Projects → Usage)

### 목표
프로젝트 클릭 시 `/projects` 또는 `/prompts?project_id=X` 로 가던 것을
**`/usage?project_id=X`** 로 변경.

### 변경 대상 파일 3곳

#### 3-1. Home 대시보드 (`apps/src/app/(dashboard)/dashboard/page.tsx`)
**현재** (line ~152):
```tsx
<Link href="/projects" className="text-brand-400 hover:text-brand-300 transition-colors">
  {p.name}
</Link>
```
**변경 후**:
```tsx
<Link href={`/usage?project_id=${p.id}`} className="text-brand-400 hover:text-brand-300 transition-colors">
  {p.name}
</Link>
```

#### 3-2. Projects 페이지 (`apps/src/app/(dashboard)/projects/page.tsx`)
**현재** (line ~97-100):
```tsx
<Link
  href={`/prompts?project_id=${project.id}`}
  className="text-zinc-100 hover:text-brand-400 transition-colors duration-150"
>
```
**변경 후**: `href={`/usage?project_id=${project.id}`}`

#### 3-3. Usage 페이지 (`apps/src/app/(dashboard)/usage/page.tsx`)
URL `?project_id=X` 파라미터를 읽어서 초기 프로젝트 필터로 설정해야 함.

**추가할 것**:
```tsx
import { useSearchParams } from "next/navigation";

// useEffect init() 내부에서:
const pid = searchParams.get("project_id");
if (pid) {
  setProjectId(pid);
  // fetchUsage 호출 시 pid 사용
}
```

주의: `useSearchParams()`는 `Suspense` 래핑이 필요할 수 있음.
Prompts 페이지에서는 `// eslint-disable-next-line react-hooks/exhaustive-deps` 패턴으로 처리함.

### 추가 수정 — Home 대시보드 API 호출 수정
현재 dashboard/page.tsx line 27: `fetch("/api/usage?days=30")`
Usage API가 이제 `year`/`month` 기반으로 바뀌어서 `days` 파라미터는 무시됨.
→ 현재 달 데이터가 반환되는 것은 맞지만, stat card 레이블이 "30일"로 표시됨.
→ `fetch("/api/usage?days=30")` → `fetch(\`/api/usage?year=${Y}&month=${M}\`)` 로 변경
→ stat card 레이블도 "이번 달" 로 변경 권장.

---

## 체크리스트

작업 완료 기준:
- [ ] 작업 1: `npm install react-day-picker` 완료, 달력 UI 표시, 데이터 없는 날짜 disabled
- [ ] 작업 2: Sessions 페이지 그리드↔리스트 전환 동작
- [ ] 작업 3: 세 파일 링크 변경 + Usage 페이지 URL 파라미터 읽기
- [ ] 전체: `npm run typecheck` 에러 없음

---

## 디자인 원칙 (반드시 준수)

- 배경: `#060a0e`, 카드: `#0d1117` (`bg-surface-card`), 테두리: `#21262d` (`border-surface-border`)
- 브랜드 색: `#22d3ee` / `#06b6d4` (`text-brand-400`, `bg-brand-600`)
- **금지**: glassmorphism, purple/violet gradient, glow effect, blob animation
- 컴포넌트 스타일: `card`, `stat-card`, `section-label`, `table-row-hover` Tailwind 클래스 사용
