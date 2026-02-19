-- Fix the email_check constraint which was causing syntax errors in generated types due to newlines/formatting
ALTER TABLE "public"."FUNCIONARIOS" DROP CONSTRAINT IF EXISTS "email_check";

-- Re-add the constraint with a clean single-line definition
ALTER TABLE "public"."FUNCIONARIOS" ADD CONSTRAINT "email_check" 
CHECK (email ~* '^.+@.+');

