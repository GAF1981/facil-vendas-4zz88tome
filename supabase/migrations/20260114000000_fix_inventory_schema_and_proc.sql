ALTER TABLE "BANCO_DE_DADOS" ADD COLUMN IF NOT EXISTS "session_id" INTEGER REFERENCES "DATAS DE INVENTÁRIO"("ID INVENTÁRIO");

CREATE INDEX IF NOT EXISTS idx_banco_dados_session_id ON "BANCO_DE_DADOS"("session_id");

CREATE OR REPLACE FUNCTION process_inventory_batch(
  p_session_id INTEGER,
  p_items JSONB,
  p_funcionario_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  item JSONB;
  v_prod_id INTEGER;
  v_prod_code INTEGER;
  v_qty NUMERIC;
  v_price NUMERIC;
  v_prod_name TEXT;
  v_prev_balance NUMERIC;
  v_current_record_id INTEGER;
  v_now TIMESTAMP;
  v_date_str TEXT;
  v_time_str TEXT;
BEGIN
  v_now := NOW();
  v_date_str := to_char(v_now, 'YYYY-MM-DD');
  v_time_str := to_char(v_now, 'HH24:MI:SS');

  -- 1. Clear existing counts for this session in CONTAGEM DE ESTOQUE FINAL
  DELETE FROM "CONTAGEM DE ESTOQUE FINAL"
  WHERE session_id = p_session_id;

  -- 2. Loop through items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := (item->>'productId')::INTEGER;
    v_prod_code := (item->>'productCode')::INTEGER;
    v_qty := (item->>'quantity')::NUMERIC;
    v_price := (item->>'price')::NUMERIC;
    v_prod_name := item->>'productName';

    -- Insert into CONTAGEM DE ESTOQUE FINAL
    INSERT INTO "CONTAGEM DE ESTOQUE FINAL" (produto_id, quantidade, session_id, valor_unitario_snapshot)
    VALUES (v_prod_id, v_qty, p_session_id, v_price);

    -- Handle BANCO_DE_DADOS
    -- Only if we have a product code (which corresponds to COD. PRODUTO in BANCO_DE_DADOS)
    IF v_prod_code IS NOT NULL THEN
      -- Check if we already have a record for this session
      SELECT "ID VENDA ITENS" INTO v_current_record_id
      FROM "BANCO_DE_DADOS"
      WHERE "COD. PRODUTO" = v_prod_code
        AND session_id = p_session_id
      LIMIT 1;

      IF v_current_record_id IS NOT NULL THEN
        -- Update existing
        UPDATE "BANCO_DE_DADOS"
        SET
          "SALDO FINAL" = v_qty,
          "CONTAGEM" = v_qty,
          "DATA DO ACERTO" = v_date_str,
          "HORA DO ACERTO" = v_time_str,
          "CODIGO FUNCIONARIO" = p_funcionario_id
        WHERE "ID VENDA ITENS" = v_current_record_id;
      ELSE
        -- Get Previous Balance
        -- Logic: latest record not from this session
        SELECT "SALDO FINAL" INTO v_prev_balance
        FROM "BANCO_DE_DADOS"
        WHERE "COD. PRODUTO" = v_prod_code
          AND (session_id IS NULL OR session_id != p_session_id)
        ORDER BY "DATA DO ACERTO" DESC, "HORA DO ACERTO" DESC
        LIMIT 1;

        IF v_prev_balance IS NULL THEN
          v_prev_balance := 0;
        END IF;

        -- Insert New
        INSERT INTO "BANCO_DE_DADOS" (
          "COD. PRODUTO",
          "CODIGO FUNCIONARIO",
          "SALDO FINAL",
          "CONTAGEM",
          "DATA DO ACERTO",
          "HORA DO ACERTO",
          "MERCADORIA",
          "TIPO",
          "SALDO INICIAL",
          "session_id"
        ) VALUES (
          v_prod_code,
          p_funcionario_id,
          v_qty,
          v_qty, -- Contagem equals Saldo Final on reset
          v_date_str,
          v_time_str,
          v_prod_name,
          'CONTAGEM_FINAL',
          v_prev_balance,
          p_session_id
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;
