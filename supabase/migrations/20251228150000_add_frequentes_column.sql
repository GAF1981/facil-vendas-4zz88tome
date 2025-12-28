-- Add FREQUENTES column to PRODUTOS table with uppercase name to match convention
ALTER TABLE "PRODUTOS" ADD COLUMN "FREQUENTES" text DEFAULT 'NÃO';

-- Add check constraint to ensure only 'SIM' or 'NÃO' are stored (Data Integrity)
ALTER TABLE "PRODUTOS" ADD CONSTRAINT "products_frequentes_check" CHECK ("FREQUENTES" IN ('SIM', 'NÃO'));
