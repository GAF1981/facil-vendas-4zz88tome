-- Enforce correct calculation of VALOR ESTOQUE SALDO FINAL
-- This migration ensures that the column is populated with the sum of VALOR ESTOQUE POR PRODUTO for each order
-- This recalculation is necessary to guarantee data integrity for the "Estoque (R$)" column display

-- Update using a CTE to aggregate totals for all existing records
WITH order_totals AS (
    SELECT "NUMERO DO PEDIDO", COALESCE(SUM("VALOR ESTOQUE POR PRODUTO"), 0) as total
    FROM "QUANTIDADE DE ESTOQUE FINAL"
    GROUP BY "NUMERO DO PEDIDO"
)
UPDATE "QUANTIDADE DE ESTOQUE FINAL" q
SET "VALOR ESTOQUE SALDO FINAL" = ot.total
FROM order_totals ot
WHERE q."NUMERO DO PEDIDO" = ot."NUMERO DO PEDIDO";

-- Ensure necessary composite index exists for performance and data integrity logic
CREATE INDEX IF NOT EXISTS idx_qef_pedido_composite ON "QUANTIDADE DE ESTOQUE FINAL" ("NUMERO DO PEDIDO", "CÓDIGO DO CLIENTE");
