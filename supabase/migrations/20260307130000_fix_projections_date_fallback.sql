-- Fix get_client_projections to correctly use "DATA E HORA" as fallback
-- Ensures calculations use the entire order history rather than just the latest two
-- Satisfies complete timeline integration per acceptance criteria

CREATE OR REPLACE FUNCTION get_client_projections()
RETURNS TABLE (
  client_id INTEGER,
  projecao NUMERIC,
  dias_entre_acertos INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH 
  sales_data AS (
      SELECT
          "CÓDIGO DO CLIENTE" as cid,
          "NÚMERO DO PEDIDO" as oid,
          COALESCE(NULLIF(TRIM("DATA DO ACERTO"::text), ''), to_char("DATA E HORA", 'YYYY-MM-DD')) as date_str,
          "VALOR VENDIDO" as val_str
      FROM "BANCO_DE_DADOS"
      WHERE (NULLIF(TRIM("DATA DO ACERTO"::text), '') IS NOT NULL OR "DATA E HORA" IS NOT NULL)
        AND "CÓDIGO DO CLIENTE" IS NOT NULL
        AND "NÚMERO DO PEDIDO" IS NOT NULL
  ),
  adj_data AS (
      SELECT
          cliente_id as cid,
          numero_pedido as oid,
          to_char(data_acerto, 'YYYY-MM-DD') as date_str,
          '0' as val_str
      FROM "AJUSTE_SALDO_INICIAL"
      WHERE data_acerto IS NOT NULL 
        AND cliente_id IS NOT NULL
  ),
  combined_raw AS (
      SELECT * FROM sales_data
      UNION ALL
      SELECT * FROM adj_data
  ),
  parsed_data AS (
      SELECT
        cid,
        oid,
        val_str,
        CASE
            WHEN date_str ~ '^\d{2}/\d{2}/\d{4}' THEN 
                to_date(substring(date_str from 1 for 10), 'DD/MM/YYYY')
            WHEN date_str ~ '^\d{2}/\d{2}/\d{2}$' THEN 
                 to_date(date_str, 'DD/MM/YY')
            WHEN date_str ~ '^\d{4}-\d{2}-\d{2}' THEN 
                to_date(substring(date_str from 1 for 10), 'YYYY-MM-DD')
            WHEN date_str LIKE '%T%' THEN
                to_date(substring(date_str from 1 for 10), 'YYYY-MM-DD')
            ELSE NULL
        END as dt
      FROM combined_raw
  ),
  parsed_values AS (
      SELECT
        cid,
        oid,
        dt,
        CASE 
             WHEN val_str ~ '^[0-9.]+,[0-9]+$' THEN CAST(REPLACE(REPLACE(val_str, '.', ''), ',', '.') AS NUMERIC)
             WHEN val_str ~ '^[0-9,]+$' THEN CAST(REPLACE(val_str, ',', '.') AS NUMERIC)
             ELSE CAST(COALESCE(NULLIF(val_str, ''), '0') AS NUMERIC)
        END as val
      FROM parsed_data
      WHERE dt IS NOT NULL
  ),
  grouped_orders AS (
      SELECT
          cid,
          oid,
          dt,
          SUM(val) as total_val
      FROM parsed_values
      GROUP BY cid, oid, dt
  ),
  client_stats AS (
      SELECT
          cid,
          MAX(dt) as max_dt,
          MIN(dt) as min_dt,
          COUNT(DISTINCT dt) as count_orders,
          SUM(total_val) as sum_val
      FROM grouped_orders
      GROUP BY cid
  ),
  base_calc AS (
      SELECT
          cid,
          max_dt,
          (max_dt - min_dt) as days_span,
          count_orders,
          sum_val,
          CASE
              WHEN count_orders > 1 AND (max_dt - min_dt) > 0 THEN (max_dt - min_dt) / (count_orders - 1)
              ELSE 0
          END as avg_days,
          CASE
              WHEN count_orders > 1 AND (max_dt - min_dt) > 0 THEN
                   (sum_val / (max_dt - min_dt)::numeric) * GREATEST((CURRENT_DATE - max_dt)::numeric, 1.0)
              ELSE 100.00
          END as calc_proj
      FROM client_stats
  )
  SELECT
      cid as client_id,
      CASE 
        WHEN calc_proj IS NULL OR calc_proj = 0 THEN 100.00 
        ELSE ROUND(calc_proj, 2) 
      END as projecao,
      COALESCE(avg_days, 0)::integer as dias_entre_acertos
  FROM base_calc;
END;
$$;
