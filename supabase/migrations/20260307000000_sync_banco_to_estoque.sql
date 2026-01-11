-- Migration to synchronize BANCO_DE_DADOS changes to QUANTIDADE DE ESTOQUE FINAL

-- 1. Add source tracking column to allow accurate updates
ALTER TABLE "QUANTIDADE DE ESTOQUE FINAL" 
ADD COLUMN IF NOT EXISTS "banco_de_dados_id" BIGINT;

-- 2. Create index for performance on lookups during sync
CREATE UNIQUE INDEX IF NOT EXISTS idx_qef_banco_de_dados_id 
ON "QUANTIDADE DE ESTOQUE FINAL" ("banco_de_dados_id");

-- 3. Create the Trigger Function
CREATE OR REPLACE FUNCTION sync_banco_to_estoque_final()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
    v_preco_num NUMERIC := 0;
    v_saldo_final NUMERIC := 0;
    v_val_produto NUMERIC := 0;
    v_total_pedido NUMERIC := 0;
    v_data_hora TIMESTAMP WITH TIME ZONE;
    v_pedido BIGINT;
BEGIN
    -- Only process if NÚMERO DO PEDIDO is present
    IF NEW."NÚMERO DO PEDIDO" IS NULL THEN
        RETURN NEW;
    END IF;

    v_pedido := NEW."NÚMERO DO PEDIDO";

    -- Parse Price (handling different formats)
    IF NEW."PREÇO VENDIDO" IS NOT NULL AND NEW."PREÇO VENDIDO" != '' THEN
        IF NEW."PREÇO VENDIDO" ~ '^[0-9.]+,[0-9]+$' THEN
            -- Format 1.234,56
            v_preco_num := CAST(REPLACE(REPLACE(NEW."PREÇO VENDIDO", '.', ''), ',', '.') AS NUMERIC);
        ELSIF NEW."PREÇO VENDIDO" ~ '^[0-9,]+$' THEN
            -- Format 1234,56
            v_preco_num := CAST(REPLACE(NEW."PREÇO VENDIDO", ',', '.') AS NUMERIC);
        ELSIF NEW."PREÇO VENDIDO" ~ '^[0-9.]+$' THEN
            -- Format 1234.56
            v_preco_num := CAST(NEW."PREÇO VENDIDO" AS NUMERIC);
        END IF;
    END IF;

    -- Calculate Product Value
    v_saldo_final := COALESCE(NEW."SALDO FINAL", 0);
    v_val_produto := v_saldo_final * v_preco_num;

    -- Determine Data/Hora
    IF NEW."DATA E HORA" IS NOT NULL THEN
        v_data_hora := NEW."DATA E HORA";
    ELSE
        -- Fallback to combining Date and Time strings
        BEGIN
            v_data_hora := (NULLIF(NEW."DATA DO ACERTO"::text, '') || ' ' || COALESCE(NULLIF(NEW."HORA DO ACERTO"::text, ''), '00:00:00'))::timestamp with time zone;
        EXCEPTION WHEN OTHERS THEN
            v_data_hora := NOW(); -- Fallback if parsing fails
        END;
    END IF;

    -- Upsert Record in QUANTIDADE DE ESTOQUE FINAL
    INSERT INTO "QUANTIDADE DE ESTOQUE FINAL" (
        "NUMERO DO PEDIDO",
        "DATA E HORA DO ACERTO",
        "CÓDIGO DO CLIENTE",
        "CLIENTE",
        "CÓDIGO DO PRODUTO",
        "MERCADORIA",
        "SALDO FINAL",
        "PREÇO VENDIDO",
        "VALOR ESTOQUE POR PRODUTO",
        "banco_de_dados_id"
    ) VALUES (
        v_pedido,
        v_data_hora,
        NEW."CÓDIGO DO CLIENTE",
        NEW."CLIENTE",
        NEW."COD. PRODUTO",
        NEW."MERCADORIA",
        v_saldo_final,
        v_preco_num,
        v_val_produto,
        NEW."ID VENDA ITENS"
    )
    ON CONFLICT ("banco_de_dados_id") DO UPDATE SET
        "NUMERO DO PEDIDO" = EXCLUDED."NUMERO DO PEDIDO",
        "DATA E HORA DO ACERTO" = EXCLUDED."DATA E HORA DO ACERTO",
        "CÓDIGO DO CLIENTE" = EXCLUDED."CÓDIGO DO CLIENTE",
        "CLIENTE" = EXCLUDED."CLIENTE",
        "CÓDIGO DO PRODUTO" = EXCLUDED."CÓDIGO DO PRODUTO",
        "MERCADORIA" = EXCLUDED."MERCADORIA",
        "SALDO FINAL" = EXCLUDED."SALDO FINAL",
        "PREÇO VENDIDO" = EXCLUDED."PREÇO VENDIDO",
        "VALOR ESTOQUE POR PRODUTO" = EXCLUDED."VALOR ESTOQUE POR PRODUTO";

    -- Calculate Total for this Order (Aggregation)
    SELECT COALESCE(SUM("VALOR ESTOQUE POR PRODUTO"), 0)
    INTO v_total_pedido
    FROM "QUANTIDADE DE ESTOQUE FINAL"
    WHERE "NUMERO DO PEDIDO" = v_pedido;

    -- Update all records for this order with the new total
    UPDATE "QUANTIDADE DE ESTOQUE FINAL"
    SET "VALOR ESTOQUE SALDO FINAL" = v_total_pedido
    WHERE "NUMERO DO PEDIDO" = v_pedido;

    RETURN NEW;
END;
$$;

-- 4. Create Trigger
DROP TRIGGER IF EXISTS trg_sync_stock_final ON "BANCO_DE_DADOS";

CREATE TRIGGER trg_sync_stock_final
AFTER INSERT OR UPDATE ON "BANCO_DE_DADOS"
FOR EACH ROW
EXECUTE FUNCTION sync_banco_to_estoque_final();

-- 5. Backfill/Sync Existing Data
-- Truncate to start fresh with new ID column
TRUNCATE TABLE "QUANTIDADE DE ESTOQUE FINAL";

-- Insert all existing data using the same logic
WITH raw_data AS (
  SELECT
    "ID VENDA ITENS" as id_venda,
    "NÚMERO DO PEDIDO" as pedido,
    CASE
      WHEN "DATA E HORA" IS NOT NULL THEN "DATA E HORA"
      ELSE (NULLIF("DATA DO ACERTO"::text, '') || ' ' || COALESCE(NULLIF("HORA DO ACERTO"::text, ''), '00:00:00'))::timestamp with time zone
    END as data_hora,
    "CÓDIGO DO CLIENTE" as cod_cliente,
    "CLIENTE" as nome_cliente,
    "COD. PRODUTO" as cod_produto,
    "MERCADORIA" as mercadoria,
    COALESCE("SALDO FINAL", 0) as saldo_final,
    CASE
        WHEN "PREÇO VENDIDO" IS NULL OR "PREÇO VENDIDO" = '' THEN 0
        WHEN "PREÇO VENDIDO" ~ '^[0-9.]+,[0-9]+$' THEN CAST(REPLACE(REPLACE("PREÇO VENDIDO", '.', ''), ',', '.') AS NUMERIC)
        WHEN "PREÇO VENDIDO" ~ '^[0-9,]+$' THEN CAST(REPLACE("PREÇO VENDIDO", ',', '.') AS NUMERIC)
        WHEN "PREÇO VENDIDO" ~ '^[0-9.]+$' THEN CAST("PREÇO VENDIDO" AS NUMERIC)
        ELSE 0
    END as preco_vendido_num
  FROM "BANCO_DE_DADOS"
  WHERE "NÚMERO DO PEDIDO" IS NOT NULL
),
calc_data AS (
  SELECT
    id_venda,
    pedido,
    data_hora,
    cod_cliente,
    nome_cliente,
    cod_produto,
    mercadoria,
    saldo_final,
    preco_vendido_num,
    (saldo_final * preco_vendido_num) as val_produto,
    SUM(saldo_final * preco_vendido_num) OVER (PARTITION BY pedido) as val_total_pedido
  FROM raw_data
)
INSERT INTO "QUANTIDADE DE ESTOQUE FINAL" (
  "NUMERO DO PEDIDO",
  "DATA E HORA DO ACERTO",
  "CÓDIGO DO CLIENTE",
  "CLIENTE",
  "CÓDIGO DO PRODUTO",
  "MERCADORIA",
  "SALDO FINAL",
  "PREÇO VENDIDO",
  "VALOR ESTOQUE POR PRODUTO",
  "VALOR ESTOQUE SALDO FINAL",
  "banco_de_dados_id"
)
SELECT
  pedido,
  data_hora,
  cod_cliente,
  nome_cliente,
  cod_produto,
  mercadoria,
  saldo_final,
  preco_vendido_num,
  val_produto,
  val_total_pedido,
  id_venda
FROM calc_data;
