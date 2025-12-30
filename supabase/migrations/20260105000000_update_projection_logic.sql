CREATE OR REPLACE FUNCTION get_client_projections()
RETURNS TABLE (
  client_id INTEGER,
  projecao NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH clean_data AS (
      SELECT
          "CÓDIGO DO CLIENTE" as cid,
          "NÚMERO DO PEDIDO" as oid,
          "DATA DO ACERTO"::date as dt,
          "VALOR VENDIDO" as val_str
      FROM "BANCO_DE_DADOS"
      WHERE "DATA DO ACERTO" IS NOT NULL 
        AND "DATA DO ACERTO" != ''
        AND "CÓDIGO DO CLIENTE" IS NOT NULL
        AND "NÚMERO DO PEDIDO" IS NOT NULL
  ),
  parsed_data AS (
      SELECT
        cid,
        oid,
        dt,
        CASE 
             WHEN val_str ~ '^[0-9.]+,[0-9]+$' THEN CAST(REPLACE(REPLACE(val_str, '.', ''), ',', '.') AS NUMERIC)
             WHEN val_str ~ '^[0-9,]+$' THEN CAST(REPLACE(val_str, ',', '.') AS NUMERIC)
             ELSE 0
        END as val
      FROM clean_data
  ),
  orders AS (
      SELECT
          cid,
          oid,
          MAX(dt) as dt, -- Get the date associated with the order ID (assuming consistency)
          SUM(val) as total_venda -- Sum value if order has multiple lines
      FROM parsed_data
      GROUP BY cid, oid
  ),
  ranked_orders AS (
      SELECT
          cid,
          oid,
          dt,
          total_venda,
          ROW_NUMBER() OVER (PARTITION BY cid ORDER BY oid DESC) as rn
      FROM orders
  ),
  latest AS (
      SELECT cid, dt, total_venda FROM ranked_orders WHERE rn = 1
  ),
  previous AS (
      SELECT cid, dt FROM ranked_orders WHERE rn = 2
  )
  SELECT
      l.cid as client_id,
      CASE
          WHEN (l.dt - p.dt) <= 0 THEN 0.0
          ELSE
              ROUND(
                  (
                    ((CURRENT_DATE - l.dt)::numeric / 30.0) *
                    (l.total_venda / ((l.dt - p.dt)::numeric / 30.0))
                  ), 2
              )
      END as projecao
  FROM latest l
  JOIN previous p ON l.cid = p.cid;
END;
$$;
