DO $$
DECLARE
    v_pedido_id BIGINT;
    v_cliente_id BIGINT;
    v_missing_amount NUMERIC;
    v_funcionario_id BIGINT;
    v_valor_venda NUMERIC;
    v_desconto_str TEXT;
    v_desconto_val NUMERIC;
    v_desconto_final NUMERIC;
    v_total_pago NUMERIC;
BEGIN
    -- Orders to adjust: 426, 372, 417
    FOR v_pedido_id IN SELECT unnest(ARRAY[426, 372, 417])
    LOOP
        -- Calculate the exact debt currently according to logic in fix_update_debito_logic.sql
        SELECT 
            MAX("CÓDIGO DO CLIENTE"),
            SUM(public.parse_currency_sql("VALOR VENDIDO")),
            MAX("DESCONTO POR GRUPO")
        INTO 
            v_cliente_id,
            v_valor_venda,
            v_desconto_str
        FROM "BANCO_DE_DADOS"
        WHERE "NÚMERO DO PEDIDO" = v_pedido_id;

        IF v_cliente_id IS NOT NULL THEN
            -- Calculate Discount
            v_desconto_val := public.parse_currency_sql(v_desconto_str);
            IF v_desconto_val > 1 THEN
                v_desconto_val := v_desconto_val / 100;
            END IF;
            v_desconto_final := COALESCE(v_valor_venda, 0) * v_desconto_val;

            -- Calculate total paid
            SELECT COALESCE(SUM(valor_pago), 0)
            INTO v_total_pago
            FROM "RECEBIMENTOS"
            WHERE venda_id = v_pedido_id;

            v_missing_amount := (COALESCE(v_valor_venda, 0) - v_desconto_final) - v_total_pago;

            IF v_missing_amount > 0 THEN
                -- Get a valid employee (admin)
                SELECT id INTO v_funcionario_id FROM "FUNCIONARIOS" ORDER BY id ASC LIMIT 1;
                
                -- Insert adjustment payment to zero out the mathematically calculated debt
                INSERT INTO "RECEBIMENTOS" (
                    venda_id,
                    cliente_id,
                    forma_pagamento,
                    valor_pago,
                    valor_registrado,
                    funcionario_id,
                    motivo,
                    created_at
                ) VALUES (
                    v_pedido_id,
                    v_cliente_id,
                    'AJUSTE MANUAL DE DÉBITO',
                    v_missing_amount,
                    v_missing_amount,
                    COALESCE(v_funcionario_id, 1),
                    'Ajuste manual de débito para zero conforme solicitação',
                    NOW()
                );
            END IF;

            -- Update BANCO_DE_DADOS explicit column for consistency
            UPDATE "BANCO_DE_DADOS"
            SET "VALOR DEVIDO" = 0
            WHERE "NÚMERO DO PEDIDO" = v_pedido_id;

            -- Force sync on debitos_historico
            PERFORM public.update_debito_historico_order(v_pedido_id);

            -- Explicitly set to 0 to satisfy the AC literally in case the trigger/function missed something
            UPDATE debitos_historico
            SET debito = 0
            WHERE pedido_id = v_pedido_id;

            -- Log to system_logs
            INSERT INTO system_logs (
                type,
                description,
                meta,
                created_at
            ) VALUES (
                'manual_adjustment',
                'Débito do pedido ' || v_pedido_id || ' ajustado manualmente para zero.',
                jsonb_build_object(
                    'pedido_id', v_pedido_id, 
                    'adjusted_amount', COALESCE(v_missing_amount, 0), 
                    'action', 'zero_debt'
                ),
                NOW()
            );

        ELSE
            -- If the order doesn't exist in BANCO_DE_DADOS but exists in debitos_historico
            UPDATE debitos_historico
            SET debito = 0
            WHERE pedido_id = v_pedido_id;
            
            -- Log to system_logs
            INSERT INTO system_logs (
                type,
                description,
                meta,
                created_at
            ) VALUES (
                'manual_adjustment',
                'Débito do pedido ' || v_pedido_id || ' (órfão) ajustado manualmente para zero.',
                jsonb_build_object(
                    'pedido_id', v_pedido_id, 
                    'action', 'zero_debt_orphan'
                ),
                NOW()
            );
        END IF;
    END LOOP;
END $$;
