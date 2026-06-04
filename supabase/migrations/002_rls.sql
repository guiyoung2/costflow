-- 002_rls.sql
-- Row Level Security policies for all 7 tables
-- Only authenticated users can access their own data

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_storage_settings ENABLE ROW LEVEL SECURITY;

-- profiles (id = auth.uid())
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_delete_own ON profiles
  FOR DELETE TO authenticated
  USING (id = auth.uid());

-- projects (user_id = auth.uid())
CREATE POLICY projects_select_own ON projects
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY projects_insert_own ON projects
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY projects_delete_own ON projects
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- api_keys (user_id = auth.uid())
CREATE POLICY api_keys_select_own ON api_keys
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY api_keys_insert_own ON api_keys
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY api_keys_delete_own ON api_keys
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- prompt_storage_settings (user_id = auth.uid())
CREATE POLICY prompt_storage_settings_select_own ON prompt_storage_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY prompt_storage_settings_insert_own ON prompt_storage_settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY prompt_storage_settings_delete_own ON prompt_storage_settings
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- sessions (indirect: project_id → projects.user_id)
CREATE POLICY sessions_select_own ON sessions
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY sessions_insert_own ON sessions
  FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY sessions_delete_own ON sessions
  FOR DELETE TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- events (indirect: session_id → sessions → projects.user_id)
CREATE POLICY events_select_own ON events
  FOR SELECT TO authenticated
  USING (session_id IN (
    SELECT id FROM sessions
    WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  ));

CREATE POLICY events_insert_own ON events
  FOR INSERT TO authenticated
  WITH CHECK (session_id IN (
    SELECT id FROM sessions
    WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  ));

CREATE POLICY events_delete_own ON events
  FOR DELETE TO authenticated
  USING (session_id IN (
    SELECT id FROM sessions
    WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  ));

-- token_usage (indirect: session_id → sessions → projects.user_id)
CREATE POLICY token_usage_select_own ON token_usage
  FOR SELECT TO authenticated
  USING (session_id IN (
    SELECT id FROM sessions
    WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  ));

CREATE POLICY token_usage_insert_own ON token_usage
  FOR INSERT TO authenticated
  WITH CHECK (session_id IN (
    SELECT id FROM sessions
    WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  ));

CREATE POLICY token_usage_delete_own ON token_usage
  FOR DELETE TO authenticated
  USING (session_id IN (
    SELECT id FROM sessions
    WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  ));
