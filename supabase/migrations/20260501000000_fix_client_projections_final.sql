-- Drop the function to redefine it with correct return types and improved logic
DROP FUNCTION IF EXISTS get_client_projections();

CREATE OR REPLACE FUNCTION get_client_projections()
RETURNS TABLE (
  client_id BIGINT,
  projecao NUMERIC,
  dias_entre_acertos INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- 1. Standard Sales Data - Using robust date fallback
  sales_data AS (
      SELECT
          "CÓDIGO DO CLIENTE" as cid,
          "NÚMERO DO PEDIDO" as oid,
          COALESCE(NULLIF(TRIM("DATA DO ACERTO"::text), ''), to_char("DATA E HORA", 'YYYY-MM-DD')) as date_str,
          "VALOR VENDIDO"::text as val_str
      FROM "BANCO_DE_DADOS"
      WHERE (NULLIF(TRIM("DATA DO ACERTO"::text), '') IS NOT NULL OR "DATA E HORA" IS NOT NULL)
        AND "CÓDIGO DO CLIENTE" IS NOT NULL
        AND "NÚMERO DO PEDIDO" IS NOT NULL
  ),
  -- 2. Initial Balance / Adjustment Data
  adj_data AS (
      SELECT
          cliente_id as cid,
          numero_pedido as oid,
          to_char(data_acerto, 'YYYY-MM-DD') as date_str,
          '0' as val_str -- Value is 0 for projection calc purposes (timeline anchor)
      FROM "AJUSTE_SALDO_INICIAL"
      WHERE data_acerto IS NOT NULL 
        AND cliente_id IS NOT NULL
  ),
  -- 3. Combine Data Sources
  combined_raw AS (
      SELECT * FROM sales_data
      UNION ALL
      SELECT * FROM adj_data
  ),
  -- 4. Parse Dates and Values with mixed format support
  parsed_data AS (
      SELECT
        cid,
        oid,
        val_str,
        CASE
            -- ISO Format (YYYY-MM-DD)
            WHEN date_str ~ '^\d{4}-\d{2}-\d{2}' THEN 
                to_date(substring(date_str from 1 for 10), 'YYYY-MM-DD')
            -- BR Format (DD/MM/YYYY)
            WHEN date_str ~ '^\d{2}/\d{2}/\d{4}' THEN 
                to_date(substring(date_str from 1 for 10), 'DD/MM/YYYY')
            -- BR Short Format (DD/MM/YY)
            WHEN date_str ~ '^\d{2}/\d{2}/\d{2}$' THEN 
                 to_date(date_str, 'DD/MM/YY')
            ELSE NULL
        END as raw_dt
      FROM combined_raw
  ),
  corrected_dates AS (
      SELECT
        cid,
        oid,
        val_str,
        CASE
            WHEN raw_dt IS NULL THEN NULL
            -- Fix Year < 1900 (e.g., 0026 -> 2026)
            WHEN EXTRACT(YEAR FROM raw_dt) < 1900 THEN
                raw_dt + (INTERVAL '2000 years')
            ELSE raw_dt
        END::date as dt
      FROM parsed_data
  ),
  parsed_values AS (
      SELECT
        cid,
        oid,
        dt,
        CASE 
             WHEN val_str ~ '^[0-9.]+,[0-9]+$' THEN CAST(REPLACE(REPLACE(val_str, '.', ''), ',', '.') AS NUMERIC)
             WHEN val_str ~ '^[0-9,]+$' THEN CAST(REPLACE(val_str, ',', '.') AS NUMERIC)
             ELSE CAST(NULLIF(val_str, '') AS NUMERIC)
        END as val
      FROM corrected_dates
      WHERE dt IS NOT NULL
  ),
  -- 5. Group by order to sum total value (handling multiple items per order)
  grouped_orders AS (
      SELECT
          cid,
          oid,
          dt,
          SUM(COALESCE(val, 0)) as total_val
      FROM parsed_values
      GROUP BY cid, oid, dt
  ),
  -- 6. Rank Orders per Client (Latest first)
  ranked_orders AS (
      SELECT
          cid,
          oid,
          dt,
          total_val,
          ROW_NUMBER() OVER (PARTITION BY cid ORDER BY dt DESC, oid DESC) as rn
      FROM grouped_orders
  ),
  -- 7. Get Latest and Previous
  latest AS (
      SELECT cid, dt, total_val FROM ranked_orders WHERE rn = 1
  ),
  previous AS (
      SELECT cid, dt FROM ranked_orders WHERE rn = 2
  ),
  -- 8. Calculate Projection securely
  base_calc AS (
      SELECT
          l.cid,
          (l.dt - p.dt) as days_diff,
          CASE
              -- If no previous data (p.dt is null), or dates are same/invalid
              WHEN p.dt IS NULL OR (l.dt - p.dt) <= 0 THEN 100.00
              
              -- Standard Calculation
              -- Monthly Avg = Val / ((DateDiff)/30)
              -- Projection = (DaysSinceLast/30) * Monthly Avg
              ELSE
                   ((CURRENT_DATE - l.dt)::numeric / 30.0) *
                   (l.total_val / ((l.dt - p.dt)::numeric / 30.0))
          END as calc_proj
      FROM latest l
      LEFT JOIN previous p ON l.cid = p.cid
  )
  SELECT
      cid as client_id,
      CASE 
        WHEN calc_proj IS NULL OR calc_proj = 0 THEN 100.00 
        ELSE ROUND(calc_proj, 2) 
      END as projecao,
      COALESCE(days_diff, 0)::integer as dias_entre_acertos
  FROM base_calc;
END;
$$;
