-- 006_codex_agent.sql
-- Phase 9: add agent column to sessions for multi-tool support (claude | codex)

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS agent text NOT NULL DEFAULT 'claude'
  CHECK (agent IN ('claude', 'codex'));
