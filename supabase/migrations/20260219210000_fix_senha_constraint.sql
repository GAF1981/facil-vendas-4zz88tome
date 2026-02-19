-- Fixes the formatting of the senha_check constraint to prevent syntax errors in generated Typescript types
ALTER TABLE "FUNCIONARIOS" DROP CONSTRAINT IF EXISTS "senha_check";
ALTER TABLE "FUNCIONARIOS" ADD CONSTRAINT "senha_check" CHECK (senha ~ '^[0-9]{4}$');
