ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "messages_from_group_allowed" boolean DEFAULT false NOT NULL;
