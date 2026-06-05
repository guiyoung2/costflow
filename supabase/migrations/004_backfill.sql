-- 004_backfill.sql
-- Phase 7: backfill normalized tables from existing events data

-- messages: UserPromptSubmit 이벤트의 prompt payload
INSERT INTO messages (session_id, turn_index, role, content, created_at)
SELECT
  e.session_id,
  COALESCE(e.turn_index, 0),
  'user',
  e.payload->>'prompt',
  e.created_at
FROM events e
WHERE e.type = 'UserPromptSubmit'
  AND e.payload->>'prompt' IS NOT NULL
ON CONFLICT (session_id, turn_index, role) DO NOTHING;

-- tool_calls: Stop 이벤트의 tool_use_names 배열
INSERT INTO tool_calls (session_id, event_id, turn_index, tool_name, created_at)
SELECT
  e.session_id,
  e.id,
  e.turn_index,
  tool_name.value,
  e.created_at
FROM events e,
     jsonb_array_elements_text(e.payload->'tool_use_names') AS tool_name(value)
WHERE e.type = 'Stop'
  AND jsonb_array_length(COALESCE(e.payload->'tool_use_names', '[]'::jsonb)) > 0;
