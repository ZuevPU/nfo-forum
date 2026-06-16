ALTER TABLE "trainer_self_diagnostics" ADD COLUMN "attempt_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "trainer_self_diagnostics" ADD COLUMN "comment" text;