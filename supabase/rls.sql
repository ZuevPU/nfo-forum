-- Row Level Security policies for Supabase
-- Backend uses service role via DATABASE_URL; RLS protects direct client access.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfo_day_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_self_diagnostics ENABLE ROW LEVEL SECURITY;

-- Public read for schedule and questions
CREATE POLICY events_read ON events FOR SELECT USING (true);
CREATE POLICY reflection_questions_read ON reflection_questions FOR SELECT USING (true);
CREATE POLICY tasks_read ON tasks FOR SELECT USING (true);

-- Users can read all participants for rating (points only via API)
CREATE POLICY users_read ON users FOR SELECT USING (true);
