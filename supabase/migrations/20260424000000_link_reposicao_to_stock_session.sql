-- Add id_estoque_carro column to REPOSIÇÃO E DEVOLUÇÃO table
ALTER TABLE "REPOSIÇÃO E DEVOLUÇÃO" ADD COLUMN id_estoque_carro BIGINT;

-- Add foreign key constraint
ALTER TABLE "REPOSIÇÃO E DEVOLUÇÃO"
ADD CONSTRAINT "fk_reposicao_estoque_carro"
FOREIGN KEY (id_estoque_carro)
REFERENCES "ID ESTOQUE CARRO" (id);

-- Backfill existing records based on timestamp overlap logic
-- matches the logic previously used in estoqueCarroService.getSessionData
UPDATE "REPOSIÇÃO E DEVOLUÇÃO" rd
SET id_estoque_carro = s.id
FROM "ID ESTOQUE CARRO" s
WHERE rd.funcionario_id = s.funcionario_id
  AND rd.created_at >= s.data_inicio
  AND (s.data_fim IS NULL OR rd.created_at <= s.data_fim);

-- Add index for performance on the new column
CREATE INDEX idx_reposicao_estoque_carro ON "REPOSIÇÃO E DEVOLUÇÃO" (id_estoque_carro);
