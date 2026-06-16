-- Форум НФО — полная DDL-схема (документация, соответствует backend/src/db/schema.ts)
-- Примечание: таблицы уже развёрнуты в Supabase. Этот файл — справочник, не миграция.

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  vk_id text NOT NULL,
  first_name text NOT NULL,
  last_name text,
  role text NOT NULL DEFAULT 'participant',
  track text,
  points integer NOT NULL DEFAULT 0,
  reflection_level integer NOT NULL DEFAULT 1,
  reflection_points integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  last_active_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_vk_id_unique ON users (vk_id);
CREATE INDEX IF NOT EXISTS idx_users_vk_id ON users (vk_id);
CREATE INDEX IF NOT EXISTS idx_users_track ON users (track);

CREATE TABLE IF NOT EXISTS events (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text,
  start_time timestamp NOT NULL,
  end_time timestamp NOT NULL,
  place text,
  track text,
  is_key_block boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_track_time ON events (track, start_time, end_time);

CREATE TABLE IF NOT EXISTS reflection_questions (
  id serial PRIMARY KEY,
  text text NOT NULL,
  type text NOT NULL,
  track text,
  publish_time timestamp NOT NULL,
  end_time timestamp,
  points integer NOT NULL DEFAULT 10,
  send_notification boolean NOT NULL DEFAULT true,
  group_id text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reflection_questions_track_publish ON reflection_questions (track, publish_time);

CREATE TABLE IF NOT EXISTS reflection_answers (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id integer NOT NULL REFERENCES reflection_questions(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reflection_answers_user_q ON reflection_answers (user_id, question_id);

CREATE TABLE IF NOT EXISTS reflection_level_history (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_level integer NOT NULL,
  new_level integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  points integer NOT NULL DEFAULT 20,
  deadline timestamp,
  track text,
  allow_multiple boolean NOT NULL DEFAULT false,
  auto_approve boolean NOT NULL DEFAULT false,
  is_random_distribution boolean NOT NULL DEFAULT false,
  is_focus_of_day boolean NOT NULL DEFAULT false,
  requires_photo boolean NOT NULL DEFAULT false,
  send_notification boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_track ON tasks (track);

CREATE TABLE IF NOT EXISTS task_submissions (
  id serial PRIMARY KEY,
  task_id integer NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_text text,
  photos text[],
  status text NOT NULL DEFAULT 'pending',
  admin_comment text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_status ON task_submissions (user_id, status);

CREATE TABLE IF NOT EXISTS exchange_questions (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  scope text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'pending',
  publish_time timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exchange_questions_status_publish ON exchange_questions (status, publish_time);

CREATE TABLE IF NOT EXISTS exchange_answers (
  id serial PRIMARY KEY,
  question_id integer NOT NULL REFERENCES exchange_questions(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exchange_answers_question ON exchange_answers (question_id);

CREATE TABLE IF NOT EXISTS exchange_assignments (
  id serial PRIMARY KEY,
  question_id integer NOT NULL REFERENCES exchange_questions(id) ON DELETE CASCADE,
  assigned_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exchange_reactions (
  id serial PRIMARY KEY,
  answer_id integer NOT NULL REFERENCES exchange_answers(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS state_checkins (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emotion text NOT NULL,
  energy_level integer NOT NULL,
  comment text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_state_checkins_user_date ON state_checkins (user_id, created_at);

CREATE TABLE IF NOT EXISTS nfo_day_reflections (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  answer_text text NOT NULL,
  factors text[] NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_history (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  source text NOT NULL,
  source_id integer,
  comment text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id serial PRIMARY KEY,
  text text NOT NULL,
  image text,
  target_type text NOT NULL,
  target_tracks text[],
  target_user_id integer REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at timestamp,
  sent_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback_messages (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trainer_self_diagnostics (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  block_id integer NOT NULL,
  question_id integer NOT NULL,
  score integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id serial PRIMARY KEY,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS system_settings_key_unique ON system_settings (key);

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
