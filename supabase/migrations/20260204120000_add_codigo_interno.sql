-- Add codigo_interno column to PRODUTOS table
ALTER TABLE "public"."PRODUTOS" ADD COLUMN IF NOT EXISTS "codigo_interno" BIGINT;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN "public"."PRODUTOS"."codigo_interno" IS 'Código Interno para identificação da empresa';
