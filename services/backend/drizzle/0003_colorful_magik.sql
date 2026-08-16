ALTER TABLE "orders" ADD COLUMN "completed_at" timestamp;
--> statement-breakpoint
UPDATE "orders" SET "completed_at" = "updated_at" WHERE "status" = 'completed' AND "completed_at" IS NULL;