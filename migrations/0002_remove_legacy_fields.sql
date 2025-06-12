-- Remove legacy fields from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "unique_code";
ALTER TABLE "users" DROP COLUMN IF EXISTS "extra_message";