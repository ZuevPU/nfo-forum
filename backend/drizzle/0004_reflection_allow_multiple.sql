ALTER TABLE reflection_questions
  ADD COLUMN IF NOT EXISTS allow_multiple boolean NOT NULL DEFAULT false;
