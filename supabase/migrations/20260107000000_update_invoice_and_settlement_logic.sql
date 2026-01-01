-- Add new columns for Invoice Management
ALTER TABLE "BANCO_DE_DADOS" ADD COLUMN IF NOT EXISTS "nota_fiscal_cadastro" TEXT;
ALTER TABLE "BANCO_DE_DADOS" ADD COLUMN IF NOT EXISTS "nota_fiscal_venda" TEXT;

-- Convert nota_fiscal_emitida to TEXT for status management
-- First, we alter the type. We assume existing boolean TRUE maps to 'Emitida' and FALSE/NULL to 'Pendente'
ALTER TABLE "BANCO_DE_DADOS" ALTER COLUMN "nota_fiscal_emitida" TYPE TEXT USING CASE WHEN "nota_fiscal_emitida" = TRUE THEN 'Emitida' ELSE 'Pendente' END;

-- Set default value
ALTER TABLE "BANCO_DE_DADOS" ALTER COLUMN "nota_fiscal_emitida" SET DEFAULT 'Pendente';
