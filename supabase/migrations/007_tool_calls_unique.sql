-- 중복 제거 (turn_index가 있는 행만 대상 — nullable이므로)
DELETE FROM tool_calls
WHERE id NOT IN (
  SELECT MIN(id)
  FROM tool_calls
  WHERE turn_index IS NOT NULL
  GROUP BY session_id, turn_index, tool_name
)
AND turn_index IS NOT NULL;

-- UNIQUE 제약 추가 (turn_index가 NOT NULL인 경우에만 동작)
ALTER TABLE tool_calls
ADD CONSTRAINT tool_calls_session_turn_name_unique
UNIQUE (session_id, turn_index, tool_name);
