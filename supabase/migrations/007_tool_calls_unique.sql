-- 중복 제거 (turn_index가 있는 행만 대상 — nullable이므로)
DELETE FROM tool_calls a
USING tool_calls b
WHERE a.turn_index IS NOT NULL
  AND b.turn_index IS NOT NULL
  AND a.session_id = b.session_id
  AND a.turn_index = b.turn_index
  AND a.tool_name = b.tool_name
  AND a.ctid > b.ctid;

-- UNIQUE 제약 추가 (turn_index가 NOT NULL인 경우에만 동작)
ALTER TABLE tool_calls
ADD CONSTRAINT tool_calls_session_turn_name_unique
UNIQUE (session_id, turn_index, tool_name);
