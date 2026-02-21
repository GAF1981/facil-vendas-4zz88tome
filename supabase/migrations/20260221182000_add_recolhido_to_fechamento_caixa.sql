ALTER TABLE "public"."fechamento_caixa" 
ADD COLUMN "recolhido_por_id" BIGINT,
ADD CONSTRAINT "fechamento_caixa_recolhido_por_id_fkey" FOREIGN KEY ("recolhido_por_id") REFERENCES "public"."FUNCIONARIOS"("id"),
ADD COLUMN "recolhido_at" TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN "public"."fechamento_caixa"."recolhido_por_id" IS 'ID do funcionário que realizou o recolhimento físico do dinheiro.';
