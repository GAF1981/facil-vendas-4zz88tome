-- View to calculate the latest Total Consigned Value (Selling Price) for each client
-- Logic:
-- 1. Identify the latest timestamp (Data e Hora) for each client in BANCO_DE_DADOS
-- 2. Sum the "VALOR CONSIGNADO TOTAL (Preço Venda)" for all records matching that client and timestamp
-- 3. Handle robust currency string parsing to numeric

CREATE OR REPLACE VIEW view_client_latest_consigned_value AS
WITH cleaned_data AS (
    SELECT
        "CÓDIGO DO CLIENTE" as client_id,
        CASE
            WHEN "DATA E HORA" IS NOT NULL THEN "DATA E HORA"
            ELSE (NULLIF("DATA DO ACERTO"::text, '') || ' ' || COALESCE(NULLIF("HORA DO ACERTO"::text, ''), '00:00:00'))::timestamp with time zone
        END as effective_date,
        "VALOR CONSIGNADO TOTAL (Preço Venda)" as raw_value
    FROM "BANCO_DE_DADOS"
    WHERE "CÓDIGO DO CLIENTE" IS NOT NULL
),
latest_dates AS (
    SELECT
        client_id,
        MAX(effective_date) as max_date
    FROM cleaned_data
    GROUP BY client_id
)
SELECT
    cd.client_id,
    SUM(
        CASE
            -- Format: 1.234,56 (BR Standard)
            WHEN REGEXP_REPLACE(cd.raw_value, '[^0-9,.]', '', 'g') ~ '^[0-9.]+,[0-9]+$'
                THEN CAST(REPLACE(REPLACE(REGEXP_REPLACE(cd.raw_value, '[^0-9,.]', '', 'g'), '.', ''), ',', '.') AS NUMERIC)
            -- Format: 1234,56
            WHEN REGEXP_REPLACE(cd.raw_value, '[^0-9,.]', '', 'g') ~ '^[0-9]+,[0-9]+$'
                THEN CAST(REPLACE(REGEXP_REPLACE(cd.raw_value, '[^0-9,.]', '', 'g'), ',', '.') AS NUMERIC)
            -- Format: 1234.56 (US Standard)
             WHEN REGEXP_REPLACE(cd.raw_value, '[^0-9,.]', '', 'g') ~ '^[0-9]+(\.[0-9]+)?$'
                THEN CAST(REGEXP_REPLACE(cd.raw_value, '[^0-9,.]', '', 'g') AS NUMERIC)
            ELSE 0
        END
    ) as total_consigned_value
FROM cleaned_data cd
JOIN latest_dates ld ON cd.client_id = ld.client_id AND cd.effective_date = ld.max_date
GROUP BY cd.client_id;
