-- Fix Debt Calculation Logic
-- Ensuring Debt = (Sales - Discount) - Paid
-- Ignoring 'VALOR DEVIDO' column from BANCO_DE_DADOS as it may be inconsistent with dynamic discount logic

DROP FUNCTION IF EXISTS update_debito_historico_order(integer);
DROP FUNCTION IF EXISTS update_debito_historico_order(bigint);

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

    -- 3. Calculate Discount
    v_desconto_val := public.parse_currency_sql(v_desconto_str);
    
    IF v_desconto_val > 0 THEN
        IF v_desconto_val < 1 THEN 
             -- e.g. 0.10 -> 10%
             v_desconto_final := v_valor_venda * v_desconto_val;
        ELSIF v_desconto_val <= 100 THEN 
             -- e.g. 10 -> 10%
             v_desconto_final := v_valor_venda * (v_desconto_val / 100.0);
        ELSE
             -- Absolute value logic fallback, though implies > 100% if treated as %, 
             -- or it's just a raw number. In this system context, large numbers 
             -- in discount usually mean absolute value if not percentage.
             -- However, "167.62" on "558.73" is exactly 30%.
             -- If parse_currency_sql returns 167.62, it is > 100.
             -- But standard logic for discounts > 100 usually means Absolute Value.
             -- But here we suspect "30%" was parsed as 30, so it fell into <= 100 block.
             -- If v_desconto_val came as 167.62, we treat as absolute.
             v_desconto_final := v_desconto_val;
        END IF;
    ELSE
        v_desconto_final := 0;
    END IF;

    -- 4. Calculate Expected Payment (Sales - Discount)
    v_saldo_a_pagar := v_valor_venda - v_desconto_final;
    
    -- 5. Calculate Debt
    v_debito := v_saldo_a_pagar - v_total_pago;
    
    -- Ensure non-negative debt (if paid more, debt is 0)
    IF v_debito < 0.01 THEN 
        v_debito := 0; 
    END IF;

    -- 6. UPSERT
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
        v_data_acerto_str,
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
        vendedor_nome = EXCLUDED.vendedor_nome,
        rota = EXCLUDED.rota;
        
END;
$$;

-- Create Trigger for BANCO_DE_DADOS updates (Sales/Discount changes)
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


-- Update Bulk Refresh Function
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
            MAX("DATA DO ACERTO") as data_acerto,
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
                        WHEN public.parse_currency_sql(v.desconto_str) < 1 THEN
                             v.valor_venda * public.parse_currency_sql(v.desconto_str)
                        WHEN public.parse_currency_sql(v.desconto_str) <= 100 THEN
                             v.valor_venda * (public.parse_currency_sql(v.desconto_str) / 100.0)
                        ELSE
                             public.parse_currency_sql(v.desconto_str)
                    END
                ELSE 0
            END as desconto_calc
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
