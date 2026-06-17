CREATE TABLE IF NOT EXISTS media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mime_type text NOT NULL,
  data bytea NOT NULL,
  size_bytes integer NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS image_media_id uuid REFERENCES media_files(id) ON DELETE SET NULL;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS link_hash text;
