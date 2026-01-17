-- Fix timestamp casting issues in update_debito_historico_order function
-- This migration updates the stored procedure to strictly cast text dates to timestamps
-- preventing the "column is of type timestamp but expression is of type text" error.

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
    v_debito NUMERIC := 0;
    
    v_cliente_id BIGINT;
    v_cliente_nome TEXT;
    v_vendedor_nome TEXT;
    v_data_acerto_str TEXT;
    v_hora_acerto TEXT;
    v_data_e_hora_str TEXT;
    v_final_timestamp TIMESTAMP;
    
BEGIN
    -- 1. Calculate Total Paid from RECEBIMENTOS
    SELECT COALESCE(SUM(valor_pago), 0)
    INTO v_total_pago
    FROM "RECEBIMENTOS"
    WHERE venda_id = p_pedido_id;

    -- 2. Calculate Total Sales and Metadata from BANCO_DE_DADOS
    SELECT 
        SUM(public.parse_currency_sql("VALOR VENDIDO")),
        MAX("CÓDIGO DO CLIENTE"),
        MAX("CLIENTE"),
        MAX("FUNCIONÁRIO"),
        MAX("DATA DO ACERTO"),
        MAX("HORA DO ACERTO"),
        MAX("DATA E HORA"), -- Prefer the ISO timestamp field if available
        MAX("DESCONTO POR GRUPO")
    INTO 
        v_valor_venda,
        v_cliente_id,
        v_cliente_nome,
        v_vendedor_nome,
        v_data_acerto_str,
        v_hora_acerto,
        v_data_e_hora_str,
        v_desconto_str
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" = p_pedido_id;

    -- If no sales data found (order doesn't exist yet), exit.
    IF v_cliente_id IS NULL THEN
        RETURN;
    END IF;

    -- 3. Determine Timestamp
    -- Try DATA E HORA first (ISO String), then fall back to DATA DO ACERTO (YYYY-MM-DD)
    BEGIN
        IF v_data_e_hora_str IS NOT NULL AND v_data_e_hora_str <> '' THEN
            v_final_timestamp := v_data_e_hora_str::TIMESTAMP;
        ELSIF v_data_acerto_str IS NOT NULL AND v_data_acerto_str <> '' THEN
            -- Try to combine date and time if available
            IF v_hora_acerto IS NOT NULL AND v_hora_acerto <> '' THEN
                v_final_timestamp := (v_data_acerto_str || ' ' || v_hora_acerto)::TIMESTAMP;
            ELSE
                v_final_timestamp := v_data_acerto_str::TIMESTAMP;
            END IF;
        ELSE
            v_final_timestamp := NOW();
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback in case of casting error
        v_final_timestamp := NOW();
    END;

    -- 4. Calculate Discount
    v_desconto_val := public.parse_currency_sql(v_desconto_str);
    
    IF v_desconto_val > 1 THEN
        v_desconto_val := v_desconto_val / 100;
    END IF;
    
    v_desconto_final := v_valor_venda * v_desconto_val;

    -- 5. Calculate Remaining Debt
    v_debito := (v_valor_venda - v_desconto_final) - v_total_pago;
    
    IF v_debito < 0.01 THEN 
        v_debito := 0; 
    END IF;

    -- 6. UPSERT into debitos_historico with Explicit Cast
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
        saldo_a_pagar
    ) VALUES (
        p_pedido_id,
        v_cliente_id,
        v_cliente_nome,
        v_valor_venda,
        v_total_pago,
        v_debito,
        v_final_timestamp, -- Insert the properly cast timestamp
        v_hora_acerto,
        v_vendedor_nome,
        v_desconto_final,
        (v_valor_venda - v_desconto_final)
    )
    ON CONFLICT (pedido_id) DO UPDATE SET
        valor_pago = EXCLUDED.valor_pago,
        debito = EXCLUDED.debito,
        saldo_a_pagar = EXCLUDED.saldo_a_pagar,
        valor_venda = EXCLUDED.valor_venda,
        desconto = EXCLUDED.desconto,
        data_acerto = EXCLUDED.data_acerto,
        vendedor_nome = EXCLUDED.vendedor_nome;
        
END;
$$;
