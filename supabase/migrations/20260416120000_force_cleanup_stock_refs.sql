-- Comprehensive cleanup of legacy stock tables and triggers to resolve "relation does not exist" errors

-- 1. Drop Table if it still exists (using CASCADE to remove dependent views and triggers automatically)
DROP TABLE IF EXISTS "QUANTIDADE DE ESTOQUE FINAL" CASCADE;

-- 2. Drop potential Triggers on BANCO_DE_DADOS (Cleanup of any legacy or orphan triggers)
DROP TRIGGER IF EXISTS "sync_stock_value" ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS "update_stock_value" ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS "sync_quantidade_estoque_final" ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS "tr_sync_estoque_final" ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS "trigger_sync_stock_values" ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS "trg_auto_sync_stock_values" ON "BANCO_DE_DADOS";
-- Guessing other potential names based on common patterns to be exhaustive
DROP TRIGGER IF EXISTS "tr_update_estoque_final" ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS "update_estoque_final" ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS "trg_update_estoque_final" ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS "sync_stock_values" ON "BANCO_DE_DADOS";

-- 3. Drop Functions (Cleanup of any legacy or orphan functions)
DROP FUNCTION IF EXISTS "calculate_stock_value"() CASCADE;
DROP FUNCTION IF EXISTS "sync_stock_value"() CASCADE;
DROP FUNCTION IF EXISTS "update_stock_values"() CASCADE;
DROP FUNCTION IF EXISTS "sync_stock_values_trigger"() CASCADE;
DROP FUNCTION IF EXISTS "process_and_save_stock_snapshot"() CASCADE;

-- 4. Clean up any views that might rely on it
-- The CASCADE option on DROP TABLE should handle most view dependencies, 
-- but ensuring we don't have broken views if they were not properly linked.
DROP VIEW IF EXISTS "view_stock_final";

