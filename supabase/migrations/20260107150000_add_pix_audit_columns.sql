-- Add audit column for Acerto Pix in BANCO_DE_DADOS
ALTER TABLE "BANCO_DE_DADOS" ADD COLUMN IF NOT EXISTS "pix_confirmado_por" TEXT;

-- Add audit column for Recebimento Pix in RECEBIMENTOS
ALTER TABLE "RECEBIMENTOS" ADD COLUMN IF NOT EXISTS "pix_confirmado_por" TEXT;
