-- sessions 테이블에 사용자 정의 세션 제목 컬럼 추가
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_title text;

-- sessions UPDATE RLS 정책 추가 (002_rls.sql에 누락된 정책)
CREATE POLICY sessions_update_own ON sessions
  FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
