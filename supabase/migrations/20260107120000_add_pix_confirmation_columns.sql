-- Add confirmation column for Acerto Pix in BANCO_DE_DADOS
ALTER TABLE "BANCO_DE_DADOS" ADD COLUMN IF NOT EXISTS "pix_acerto_confirmado" BOOLEAN DEFAULT FALSE;

-- Add confirmation column for Recebimento Pix in RECEBIMENTOS
ALTER TABLE "RECEBIMENTOS" ADD COLUMN IF NOT EXISTS "pix_recebimento_confirmado" BOOLEAN DEFAULT FALSE;
