-- Fix get_client_projections to handle mixed date formats (ISO and BR) gracefully
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
          "DATA DO ACERTO",
          "VALOR VENDIDO" as val_str
      FROM "BANCO_DE_DADOS"
      WHERE "DATA DO ACERTO" IS NOT NULL 
        AND "DATA DO ACERTO" != ''
        AND "CÓDIGO DO CLIENTE" IS NOT NULL
        AND "NÚMERO DO PEDIDO" IS NOT NULL
  ),
  parsed_dates AS (
      SELECT
        cid,
        oid,
        val_str,
        CASE
            -- Try to match DD/MM/YYYY (BR Format)
            WHEN "DATA DO ACERTO" ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}' THEN 
                to_date(substring("DATA DO ACERTO" from 1 for 10), 'DD/MM/YYYY')
            
            -- Try to match YYYY-MM-DD (ISO Format)
            WHEN "DATA DO ACERTO" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN 
                to_date(substring("DATA DO ACERTO" from 1 for 10), 'YYYY-MM-DD')
            
            -- Fallback for other potential formats or just try cast if standard
            ELSE NULL
        END as dt
      FROM clean_data
  ),
  parsed_values AS (
      SELECT
        cid,
        oid,
        dt,
        CASE 
             WHEN val_str ~ '^[0-9.]+,[0-9]+$' THEN CAST(REPLACE(REPLACE(val_str, '.', ''), ',', '.') AS NUMERIC)
             WHEN val_str ~ '^[0-9,]+$' THEN CAST(REPLACE(val_str, ',', '.') AS NUMERIC)
             ELSE 0
        END as val
      FROM parsed_dates
      WHERE dt IS NOT NULL -- Safely exclude rows where date parsing failed
  ),
  orders AS (
      SELECT
          cid,
          oid,
          MAX(dt) as dt, 
          SUM(val) as total_venda 
      FROM parsed_values
      GROUP BY cid, oid
  ),
  ranked_orders AS (
      SELECT
          cid,
          oid,
          dt,
          total_venda,
          ROW_NUMBER() OVER (PARTITION BY cid ORDER BY dt DESC, oid DESC) as rn
      FROM orders
  ),
  latest AS (
      SELECT cid, dt, total_venda FROM ranked_orders WHERE rn = 1
  ),
  previous AS (
      SELECT cid, dt FROM ranked_orders WHERE rn = 2
  ),
  base_calc AS (
      SELECT
          l.cid,
          CASE
              WHEN (l.dt - p.dt) <= 0 AND l.total_venda > 0 THEN
                   -- Fallback Monthly Average = Total / 2
                   -- Projection = (DaysSince / 30) * (Total / 2)
                   ((CURRENT_DATE - l.dt)::numeric / 30.0) * (l.total_venda / 2.0)
              WHEN (l.dt - p.dt) <= 0 THEN 0.0
              ELSE
                   ((CURRENT_DATE - l.dt)::numeric / 30.0) *
                   (l.total_venda / ((l.dt - p.dt)::numeric / 30.0))
          END as calc_proj
      FROM latest l
      JOIN previous p ON l.cid = p.cid
  )
  SELECT
      cid as client_id,
      CASE WHEN ROUND(calc_proj, 2) = 0 THEN 100.00 ELSE ROUND(calc_proj, 2) END as projecao
  FROM base_calc;
END;
$$;
