-- Update the function to calculate stock value based on the NEW User Story requirements:
-- 1. Use the Highest Order Number (MAX "NÚMERO DO PEDIDO") instead of date sorting.
-- 2. Multiply "SALDO FINAL" by "PREÇO VENDIDO" (from BANCO_DE_DADOS) instead of PRODUTOS table price.

CREATE OR REPLACE FUNCTION get_clients_last_stock_value()
RETURNS TABLE (
  client_id INTEGER,
  stock_value NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH max_orders AS (
    SELECT
      "CÓDIGO DO CLIENTE" as client_code,
      MAX("NÚMERO DO PEDIDO") as max_order_id
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" IS NOT NULL
    GROUP BY "CÓDIGO DO CLIENTE"
  )
  SELECT
    mo.client_code as client_id,
    COALESCE(SUM(
      bd."SALDO FINAL" * public.parse_currency_sql(bd."PREÇO VENDIDO")
    ), 0) as stock_value
  FROM "BANCO_DE_DADOS" bd
  JOIN max_orders mo ON bd."NÚMERO DO PEDIDO" = mo.max_order_id
  GROUP BY mo.client_code;
END;
$$;
