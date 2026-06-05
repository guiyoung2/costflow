-- 003_normalize.sql
-- Phase 7: normalized tables for messages, tool_calls, skill_usages, agent_usages

CREATE TABLE messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  turn_index  integer NOT NULL,
  role        text NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'assistant')),
  content     text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(session_id, turn_index, role)
);

CREATE TABLE tool_calls (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_id    uuid REFERENCES events(id) ON DELETE SET NULL,
  turn_index  integer,
  tool_name   text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE skill_usages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  skill_name  text NOT NULL,
  source      text NOT NULL DEFAULT 'unknown'
    CHECK (source IN ('actual', 'unknown')),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE agent_usages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  agent_id    text NOT NULL,
  source      text NOT NULL DEFAULT 'unknown'
    CHECK (source IN ('actual', 'unknown')),
  created_at  timestamptz DEFAULT now()
);

-- RLS

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_owner" ON messages
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN projects p ON p.id = s.project_id
      WHERE p.user_id = auth.uid()
    )
  );

ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tool_calls_owner" ON tool_calls
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN projects p ON p.id = s.project_id
      WHERE p.user_id = auth.uid()
    )
  );

ALTER TABLE skill_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skill_usages_owner" ON skill_usages
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN projects p ON p.id = s.project_id
      WHERE p.user_id = auth.uid()
    )
  );

ALTER TABLE agent_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_usages_owner" ON agent_usages
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN projects p ON p.id = s.project_id
      WHERE p.user_id = auth.uid()
    )
  );
