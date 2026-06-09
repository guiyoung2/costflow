# phase10-codex-hook 진행 현황

## 마지막 업데이트
2026-06-09T23:59:08+0900 — Step 2/3 완료

## 완료된 작업
- Step 1: codex-hook-settings-init — settings.ts에 addCodexHooks/removeCodexHooks/hasCodexHooks 추가, init.ts에 Codex hook 등록 질문 분기 추가
- Step 2: transcript-fix-codex-branch-dedup — turn_index 0-based 수정, transcript.test.ts 4개 테스트, hook.ts --agent 플래그, 007 마이그레이션(UNIQUE 제약), ingestion upsert+ignoreDuplicates

## 현재 진행 중
- Step 3: uninstall-status-codex

## 다음 할 일
- costflow uninstall: .codex/hooks.json에서 costflow hook 엔트리 제거 로직 추가
- costflow status: Codex hook 등록 상태 표시 추가
- uninstall.ts와 status.ts 수정

## 주의사항
- addCodexHooks에 `commandWindows` 필드 포함 (Windows 지원)
- CODEX_HOOK_EVENTS는 "Stop", "UserPromptSubmit" 2개 (Claude Code 4개와 다름)
- Codex hooks.json은 .codex/hooks.json에 위치 (Claude Code는 .claude/settings.json)
- 007_tool_calls_unique.sql은 아직 Supabase에 적용 안 됨 — Step 2 완료 후 수동 적용 필요 (blocked_reason 아님, 배포 절차)
- tool_calls upsert는 onConflict='session_id,turn_index,tool_name' 사용 (insert + ignoreDuplicates는 supabase-js 미지원)
