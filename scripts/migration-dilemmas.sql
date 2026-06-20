-- Migration: Море или горы в НФО (dilemmas feature)
-- Run once on production database

CREATE TABLE IF NOT EXISTS dilemmas (
  id              SERIAL PRIMARY KEY,
  text            TEXT NOT NULL,
  option_a        TEXT NOT NULL,
  option_b        TEXT NOT NULL,
  published_at    TIMESTAMP NOT NULL,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  points_per_vote INTEGER NOT NULL DEFAULT 3,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dilemma_votes (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dilemma_id     INTEGER NOT NULL REFERENCES dilemmas(id) ON DELETE CASCADE,
  chosen_option  TEXT NOT NULL,
  comment        TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT dilemma_votes_user_dilemma_unique UNIQUE (user_id, dilemma_id)
);

CREATE INDEX IF NOT EXISTS idx_dilemma_votes_dilemma ON dilemma_votes(dilemma_id);
