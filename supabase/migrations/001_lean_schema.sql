-- 001_lean_schema.sql
-- Costflow lean start data model
-- Table creation order follows FK dependencies:
-- profiles → projects → api_keys → sessions → events → token_usage → prompt_storage_settings

CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE,
  name         text NOT NULL,
  key_hash     text NOT NULL,
  key_prefix   text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id_ext text NOT NULL,
  model          text,
  started_at     timestamptz,
  ended_at       timestamptz,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(project_id, session_id_ext)
);

CREATE TABLE events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type         text NOT NULL,
  payload      jsonb,
  token_source text NOT NULL DEFAULT 'unknown'
    CHECK (token_source IN ('actual', 'estimated', 'unknown')),
  turn_index   integer,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE token_usage (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_id              uuid REFERENCES events(id) ON DELETE SET NULL,
  turn_index            integer NOT NULL,
  input_tokens          bigint NOT NULL DEFAULT 0,
  output_tokens         bigint NOT NULL DEFAULT 0,
  cache_creation_tokens bigint NOT NULL DEFAULT 0,
  cache_read_tokens     bigint NOT NULL DEFAULT 0,
  created_at            timestamptz DEFAULT now(),
  UNIQUE(session_id, turn_index)
);

CREATE TABLE prompt_storage_settings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode       text NOT NULL DEFAULT 'redacted'
    CHECK (mode IN ('redacted', 'raw', 'metadata_only')),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
