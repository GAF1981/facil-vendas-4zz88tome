-- Migration to change DATA DO ACERTO column from text to DATE in BANCO_DE_DADOS table
-- This ensures correct chronological sorting and data integrity as per user story.

-- 1. Sanitize data: Convert empty strings to NULL to avoid casting errors
-- It's safe to treat empty strings as NULL for a Date column
UPDATE "public"."BANCO_DE_DADOS"
SET "DATA DO ACERTO" = NULL
WHERE "DATA DO ACERTO" = '';

-- 2. Alter the column type to DATE using explicit casting
-- Using ::DATE handles standard YYYY-MM-DD strings correctly
ALTER TABLE "public"."BANCO_DE_DADOS"
ALTER COLUMN "DATA DO ACERTO" TYPE DATE
USING "DATA DO ACERTO"::DATE;

-- 3. Create an index on the DATA DO ACERTO column to improve sorting and filtering performance
CREATE INDEX IF NOT EXISTS "idx_banco_de_dados_data_do_acerto"
ON "public"."BANCO_DE_DADOS" ("DATA DO ACERTO");
