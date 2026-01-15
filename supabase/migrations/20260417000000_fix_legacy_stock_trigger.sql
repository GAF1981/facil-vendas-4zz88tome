-- Migration to drop legacy triggers and functions causing "relation does not exist" errors
-- Specifically targeting trg_sync_stock_final which was created in 20260309160000 migration

-- 1. Drop the specific legacy trigger on BANCO_DE_DADOS
DROP TRIGGER IF EXISTS trg_sync_stock_final ON "BANCO_DE_DADOS";

-- 2. Drop the associated function
DROP FUNCTION IF EXISTS sync_banco_to_estoque_final();

-- 3. Cleanup other potential legacy triggers just in case (duplicates from previous attempts to ensure clean slate)
DROP TRIGGER IF EXISTS sync_stock_value ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS update_stock_value ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS tr_sync_estoque_final ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS trigger_sync_stock_values ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS trg_auto_sync_stock_values ON "BANCO_DE_DADOS";

-- 4. Drop legacy tables if they still exist to prevent confusion
DROP TABLE IF EXISTS "QUANTIDADE DE ESTOQUE FINAL" CASCADE;
DROP TABLE IF EXISTS "CONTAGEM DE ESTOQUE FINAL" CASCADE;

-- 5. Drop legacy views if they exist
DROP VIEW IF EXISTS "view_stock_final";
