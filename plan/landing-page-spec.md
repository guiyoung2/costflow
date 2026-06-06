# Landing Page 구현 스펙

> 새 세션에서 이 파일을 먼저 읽고 구현 시작할 것.
> 목표 디자인: `.superpowers/brainstorm/2844-1780744256/content/landing-v3.html`

## 확정된 디자인

### 색상 / 분위기
- 배경: `#060a0e` (쿨 딥 다크, 보라 아님)
- 액센트: `#22d3ee` (사이언)
- 텍스트: `#f0f0f2`
- 보조 텍스트: `#9ca3af`
- Muted: `#4b5563`
- Surface: `#0d1219`
- Border: `rgba(255,255,255,0.07)`

### 파티클 네트워크 (핵심 인터렉티브 요소)
- Canvas `position: fixed`, 전체 페이지 배경으로 항상 깔림
- 노드 수: 화면 크기 비례 (`W*H / 9000`, max 120개)
- **Hub 노드** (전체의 8%): 크기 2~4px, 링 펄스 애니메이션
- **연결선**: 거리 130px 이하 연결, base alpha 0.12
- **마우스 스팟라이트**: 마우스 주변 260px 반경 radial gradient glow
- **마우스 반응**: 200px 이내 노드/연결선 밝아짐 + 굵어짐, 부드러운 lerp 추적
- **앰비언트 글로우**: 배경에서 천천히 움직이는 대형 glow 덩어리

### 페이지 섹션 구성
1. **Navbar** (fixed, 스크롤 시 backdrop-blur)
   - 좌: `Cost<span>flow</span>` (span에 accent 색)
   - 우: `Login →` 버튼 (border style)

2. **Hero** (100vh)
   - 배경: 파티클 canvas + 좌측 52px 격자 그리드 (mask로 fade)
   - 레이아웃: **비대칭 2컬럼** — 좌(텍스트) / 우(위젯)
   - 좌측:
     - 태그 뱃지: `Claude Code · Codex Analytics` (blink dot)
     - H1: `Token cost, finally visible.` (`finally`에 accent 색)
     - 서브텍스트: 2줄
     - **CTA: `Get Started` 버튼만** (Login 버튼 없음 — navbar에 있으므로)
     - 노트: `무료 · 설치 5분`
   - 우측: 라이브 위젯 카드
     - Today Cost (카운터 애니메이션, accent 색)
     - Tokens (카운터 애니메이션)
     - Cache Hit Rate (카운터 + 프로그레스바)
     - 7-day 바차트
     - 최근 세션 2개 목록

3. **Features** (padding: 108px)
   - 아이오마크: `Why Costflow`
   - 제목: `필요한 것만. / 정확하게.`
   - 비균등 그리드: `1.35fr 1fr 1fr`, 2행
     - Large 카드 (row-span 2): 세션별 실시간 추적 + 미니 라이브 차트
     - 나머지 4개: Claude+Codex 통합 / 캐시 절감 / 프로젝트 드릴다운 / 설치 5분
   - 카드 hover: `border-color` accent + `translateY(-3px)`
   - 스크롤 reveal 애니메이션 (IntersectionObserver)

4. **Dashboard Preview** (padding: 0 52px 108px)
   - 실제 대시보드 UI 목업 (브라우저 크롬 스타일)
   - `animation: float 5s ease-in-out infinite alternate` (위아래 floating)
   - 내부: Sidebar + 통계 4개 + 7-day 바차트

5. **CTA** (border-top, padding: 80px 52px 110px)
   - 헤드라인: `지금 얼마 쓰고 있는지 아세요?`
   - 서브: `5분이면 연동됩니다.`
   - `무료로 시작하기` 버튼 (center)

### 애니메이션 목록
| 요소 | 애니메이션 |
|------|-----------|
| 파티클 노드 | 지속 drift + pulse |
| Hub 노드 | 링 pulse glow |
| 마우스 근접 | 노드 확대 + 연결선 밝아짐 |
| Get Started 버튼 | hover: translateY(-1px) + shadow 강화 |
| Tag dot | blink (opacity 1→0.15) |
| 카운터 (비용, 토큰, 캐시) | 0 → 최종값 easeOutCubic, 1.8s |
| Cache progress bar | width 0 → 68%, 2s |
| 차트 바 | scaleY(0 → 1), staggered |
| Feature 카드 | 스크롤 reveal (opacity+translateY) |
| Dashboard Preview | float Y 5s infinite |
| Navbar | 스크롤 시 backdrop-blur + border |

---

## 라우팅 변경 (필수)

### 현재
- `/` → `(dashboard)/page.tsx` (보호 경로)
- middleware PROTECTED_PATHS: `["/", "/projects", ...]`
- 로그인 후 redirect: `/auth/callback?next=/`

### 변경 후
- `/` → `app/page.tsx` (공개, 랜딩 페이지)
- `/dashboard` → `(dashboard)/dashboard/page.tsx` (보호)
- middleware PROTECTED_PATHS: `["/dashboard", "/projects", "/usage", "/sessions", "/settings"]`
- 로그인 후 redirect: `/auth/callback?next=/dashboard`
- middleware 로그인 유저 redirect: `/login` → `/dashboard`
- Sidebar Home 링크: `/` → `/dashboard`

### 변경할 파일 목록
| 파일 | 변경 내용 |
|------|----------|
| `apps/src/middleware.ts` | PROTECTED_PATHS, 로그인 유저 redirect 경로 |
| `apps/src/app/(dashboard)/dashboard/page.tsx` | 신규 생성 (기존 `(dashboard)/page.tsx` 내용 이동) |
| `apps/src/app/(dashboard)/page.tsx` | 삭제 (Bash로 제거) |
| `apps/src/app/page.tsx` | 신규 생성 (랜딩 페이지) |
| `apps/src/components/Sidebar.tsx` | navItems[0].href: `/` → `/dashboard` |
| `apps/src/app/(auth)/login/page.tsx` | `?next=/` → `?next=/dashboard` |

---

## 구현 주의사항

- `app/page.tsx`는 `"use client"` 필요 (canvas, useEffect)
- canvas 초기화는 `window` 로드 후 (`useEffect` 내부)
- 파티클 canvas는 `pointer-events: none`으로 클릭 통과
- Tailwind custom color 변경 없이 inline style로 `#22d3ee` 사용
- 기존 대시보드 코드는 그대로 유지 (경로만 이동)
- `isActive` 함수: Home href가 `/dashboard`로 바뀌므로 체크 로직 확인
