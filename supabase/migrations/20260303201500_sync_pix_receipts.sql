-- Make nome_no_pix nullable in PIX table to allow automatic creation without details
ALTER TABLE "public"."PIX" ALTER COLUMN "nome_no_pix" DROP NOT NULL;

-- Make banco_pix nullable as well to avoid constraint errors during auto-creation
ALTER TABLE "public"."PIX" ALTER COLUMN "banco_pix" DROP NOT NULL;

-- Create function to auto-sync RECEBIMENTOS to PIX
CREATE OR REPLACE FUNCTION public.sync_pix_receipt_on_insert()
RETURNS trigger AS $$
BEGIN
    IF NEW.forma_pagamento ILIKE '%pix%' THEN
        INSERT INTO "public"."PIX" (recebimento_id, venda_id)
        VALUES (NEW.id, NEW.venda_id)
        ON CONFLICT (recebimento_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_sync_pix_receipt ON "public"."RECEBIMENTOS";

-- Create trigger on RECEBIMENTOS
CREATE TRIGGER trg_sync_pix_receipt
AFTER INSERT OR UPDATE OF forma_pagamento ON "public"."RECEBIMENTOS"
FOR EACH ROW
EXECUTE FUNCTION public.sync_pix_receipt_on_insert();

-- Backfill missing PIX records for existing Pix receipts
INSERT INTO "public"."PIX" (recebimento_id, venda_id)
SELECT id, venda_id
FROM "public"."RECEBIMENTOS"
WHERE forma_pagamento ILIKE '%pix%'
ON CONFLICT (recebimento_id) DO NOTHING;
