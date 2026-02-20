-- Drop older overloaded versions if they exist
DROP FUNCTION IF EXISTS update_debito_historico_order(integer);
DROP FUNCTION IF EXISTS update_debito_historico_order(bigint);

-- Robust Function to Calculate and Update Debt History
CREATE OR REPLACE FUNCTION update_debito_historico_order(p_pedido_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_pago NUMERIC := 0;
    v_valor_venda NUMERIC := 0;
    v_desconto_str TEXT;
    v_desconto_val NUMERIC := 0;
    v_desconto_final NUMERIC := 0;
    v_saldo_a_pagar NUMERIC := 0;
    v_debito NUMERIC := 0;
    
    v_cliente_id BIGINT;
    v_cliente_nome TEXT;
    v_vendedor_nome TEXT;
    v_data_acerto_str TEXT;
    v_hora_acerto TEXT;
    v_rota TEXT;
    v_data_acerto_ts TIMESTAMP;
BEGIN
    -- 1. Calculate Total Paid from RECEBIMENTOS
    SELECT COALESCE(SUM(valor_pago), 0)
    INTO v_total_pago
    FROM "RECEBIMENTOS"
    WHERE venda_id = p_pedido_id;

    -- 2. Fetch Sales Data
    SELECT 
        SUM(public.parse_currency_sql("VALOR VENDIDO")),
        MAX("CÓDIGO DO CLIENTE"),
        MAX("CLIENTE"),
        MAX("FUNCIONÁRIO"),
        MAX("DATA DO ACERTO"),
        MAX("HORA DO ACERTO"),
        MAX("DESCONTO POR GRUPO")
    INTO 
        v_valor_venda,
        v_cliente_id,
        v_cliente_nome,
        v_vendedor_nome,
        v_data_acerto_str,
        v_hora_acerto,
        v_desconto_str
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" = p_pedido_id;

    IF v_cliente_id IS NULL THEN
        RETURN;
    END IF;

    -- Get Rota Name
    SELECT "GRUPO ROTA" INTO v_rota
    FROM "CLIENTES"
    WHERE "CODIGO" = v_cliente_id;

    -- 3. Calculate Discount safely
    v_desconto_val := public.parse_currency_sql(v_desconto_str);
    
    IF v_desconto_val > 0 THEN
        IF v_desconto_str LIKE '%%%' THEN
             v_desconto_final := v_valor_venda * (public.parse_currency_sql(REPLACE(v_desconto_str, '%', '')) / 100.0);
        ELSIF v_desconto_val < 1 THEN 
             -- e.g. 0.10 -> 10%
             v_desconto_final := v_valor_venda * v_desconto_val;
        ELSIF v_desconto_val <= 100 THEN 
             -- e.g. 10 -> 10%
             v_desconto_final := v_valor_venda * (v_desconto_val / 100.0);
        ELSE
             -- Absolute values larger than 100
             v_desconto_final := v_desconto_val;
        END IF;
    ELSE
        v_desconto_final := 0;
    END IF;

    -- 4. Calculate Expected Payment (Sales - Discount)
    v_saldo_a_pagar := v_valor_venda - v_desconto_final;
    
    -- 5. Calculate Debt
    v_debito := v_saldo_a_pagar - v_total_pago;
    
    IF v_debito < 0.01 THEN 
        v_debito := 0; 
    END IF;

    -- Handle date formatting reliably
    BEGIN
        IF v_data_acerto_str IS NOT NULL AND v_data_acerto_str <> '' THEN
            IF v_hora_acerto IS NOT NULL AND v_hora_acerto <> '' THEN
                v_data_acerto_ts := (v_data_acerto_str || ' ' || v_hora_acerto)::TIMESTAMP;
            ELSE
                v_data_acerto_ts := v_data_acerto_str::TIMESTAMP;
            END IF;
        ELSE
            v_data_acerto_ts := NOW();
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_data_acerto_ts := NOW();
    END;

    -- 6. UPSERT into debitos_historico
    INSERT INTO debitos_historico (
        pedido_id,
        cliente_codigo,
        cliente_nome,
        valor_venda,
        valor_pago,
        debito,
        data_acerto,
        hora_acerto,
        vendedor_nome,
        desconto,
        saldo_a_pagar,
        rota
    ) VALUES (
        p_pedido_id,
        v_cliente_id,
        v_cliente_nome,
        v_valor_venda,
        v_total_pago,
        v_debito,
        v_data_acerto_ts,
        v_hora_acerto,
        v_vendedor_nome,
        v_desconto_final,
        v_saldo_a_pagar,
        v_rota
    )
    ON CONFLICT (pedido_id) DO UPDATE SET
        valor_pago = EXCLUDED.valor_pago,
        debito = EXCLUDED.debito,
        saldo_a_pagar = EXCLUDED.saldo_a_pagar,
        valor_venda = EXCLUDED.valor_venda,
        desconto = EXCLUDED.desconto,
        data_acerto = EXCLUDED.data_acerto,
        hora_acerto = EXCLUDED.hora_acerto,
        vendedor_nome = EXCLUDED.vendedor_nome,
        rota = EXCLUDED.rota;
        
END;
$$;


CREATE OR REPLACE FUNCTION refresh_debitos_historico()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM debitos_historico;

    INSERT INTO debitos_historico (
        pedido_id,
        data_acerto,
        hora_acerto,
        vendedor_nome,
        cliente_codigo,
        cliente_nome,
        rota,
        valor_venda,
        desconto,
        saldo_a_pagar,
        valor_pago,
        debito
    )
    WITH vendas AS (
        SELECT 
            "NÚMERO DO PEDIDO" as pedido_id,
            MAX("DATA DO ACERTO") as data_acerto_str,
            MAX("HORA DO ACERTO") as hora_acerto,
            MAX("FUNCIONÁRIO") as vendedor_nome,
            MAX("CÓDIGO DO CLIENTE") as cliente_id,
            MAX("CLIENTE") as cliente_nome,
            MAX("DESCONTO POR GRUPO") as desconto_str,
            SUM(public.parse_currency_sql("VALOR VENDIDO")) as valor_venda
        FROM "BANCO_DE_DADOS"
        WHERE "NÚMERO DO PEDIDO" IS NOT NULL
        GROUP BY "NÚMERO DO PEDIDO"
    ),
    vendas_calc AS (
        SELECT 
            v.*,
            -- Replicate Discount Logic
            CASE 
                WHEN public.parse_currency_sql(v.desconto_str) > 0 THEN
                    CASE
                        WHEN v.desconto_str LIKE '%%%' THEN
                             v.valor_venda * (public.parse_currency_sql(REPLACE(v.desconto_str, '%', '')) / 100.0)
                        WHEN public.parse_currency_sql(v.desconto_str) < 1 THEN
                             v.valor_venda * public.parse_currency_sql(v.desconto_str)
                        WHEN public.parse_currency_sql(v.desconto_str) <= 100 THEN
                             v.valor_venda * (public.parse_currency_sql(v.desconto_str) / 100.0)
                        ELSE
                             public.parse_currency_sql(v.desconto_str)
                    END
                ELSE 0
            END as desconto_calc,
            public.safe_cast_timestamp(v.data_acerto_str, v.hora_acerto) as data_acerto
        FROM vendas v
    ),
    pagamentos AS (
        SELECT 
            venda_id,
            SUM(valor_pago) as valor_pago
        FROM "RECEBIMENTOS"
        GROUP BY venda_id
    ),
    client_info AS (
        SELECT "CODIGO" as cliente_id, "GRUPO ROTA" as rota
        FROM "CLIENTES"
    )
    SELECT
        vc.pedido_id,
        vc.data_acerto,
        vc.hora_acerto,
        vc.vendedor_nome,
        vc.cliente_id,
        vc.cliente_nome,
        client_info.rota,
        vc.valor_venda,
        vc.desconto_calc,
        (vc.valor_venda - vc.desconto_calc),
        COALESCE(p.valor_pago, 0),
        GREATEST(0, (vc.valor_venda - vc.desconto_calc) - COALESCE(p.valor_pago, 0))
    FROM vendas_calc vc
    LEFT JOIN pagamentos p ON vc.pedido_id = p.venda_id
    LEFT JOIN client_info ON vc.cliente_id = client_info.cliente_id;
END;
$$;

-- Ensure Trigger for BANCO_DE_DADOS updates (Sales/Discount changes) calls correct function
CREATE OR REPLACE FUNCTION trigger_update_debito_historico_sales()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_debito_historico_order(NEW."NÚMERO DO PEDIDO");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_debito_historico_sales ON "BANCO_DE_DADOS";

CREATE TRIGGER trg_update_debito_historico_sales
AFTER INSERT OR UPDATE ON "BANCO_DE_DADOS"
FOR EACH ROW
EXECUTE FUNCTION trigger_update_debito_historico_sales();


-- Ensure trigger on RECEBIMENTOS is also calling the correct function
CREATE OR REPLACE FUNCTION trigger_update_debito_historico()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_debito_historico_order(OLD.venda_id);
    RETURN OLD;
  ELSE
    PERFORM update_debito_historico_order(NEW.venda_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_debito_historico_recebimentos ON "RECEBIMENTOS";

CREATE TRIGGER trg_update_debito_historico_recebimentos
AFTER INSERT OR UPDATE OR DELETE ON "RECEBIMENTOS"
FOR EACH ROW
EXECUTE FUNCTION trigger_update_debito_historico();
