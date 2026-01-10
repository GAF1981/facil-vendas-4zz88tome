-- Update the function to calculate stock value based on the NEW User Story requirements:
-- 1. Identify the latest order (pedido) for each client based on DATE and TIME (matching application logic).
-- 2. Calculate the stock value for that specific order by multiplying "SALDO FINAL" (from BANCO_DE_DADOS) by "PREÇO" (from PRODUTOS table).
-- 3. Ensure price is parsed correctly from string to number.

CREATE OR REPLACE FUNCTION get_clients_last_stock_value()
RETURNS TABLE (
  client_id INTEGER,
  stock_value NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH latest_orders AS (
    -- Find the most recent order for each client
    SELECT DISTINCT ON ("CÓDIGO DO CLIENTE")
      "CÓDIGO DO CLIENTE" as client_code,
      "NÚMERO DO PEDIDO" as order_id
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" IS NOT NULL
      AND "DATA DO ACERTO" IS NOT NULL
    ORDER BY "CÓDIGO DO CLIENTE", "DATA DO ACERTO" DESC, "HORA DO ACERTO" DESC, "NÚMERO DO PEDIDO" DESC
  )
  SELECT
    lo.client_code as client_id,
    COALESCE(SUM(
      bd."SALDO FINAL" * public.parse_currency_sql(p."PREÇO")
    ), 0) as stock_value
  FROM "BANCO_DE_DADOS" bd
  JOIN latest_orders lo ON bd."NÚMERO DO PEDIDO" = lo.order_id
  LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."CODIGO"
  WHERE p."PREÇO" IS NOT NULL
  GROUP BY lo.client_code;
END;
$$;
