ALTER TABLE "public"."RECEBIMENTOS" ADD COLUMN IF NOT EXISTS "forma_cobranca" text;
ALTER TABLE "public"."RECEBIMENTOS" ADD COLUMN IF NOT EXISTS "data_combinada" date;

CREATE OR REPLACE FUNCTION public.clear_cobranca_info_if_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Clear collection info if debt is cleared (paid >= registered)
  -- Using 0.01 tolerance for float arithmetic safety
  IF (NEW.valor_pago + 0.01) >= NEW.valor_registrado THEN
    NEW.forma_cobranca := NULL;
    NEW.data_combinada := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clear_cobranca_info ON "public"."RECEBIMENTOS";
CREATE TRIGGER trigger_clear_cobranca_info
BEFORE INSERT OR UPDATE ON "public"."RECEBIMENTOS"
FOR EACH ROW
EXECUTE FUNCTION public.clear_cobranca_info_if_paid();
