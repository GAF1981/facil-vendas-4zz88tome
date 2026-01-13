CREATE OR REPLACE FUNCTION transfer_unattended_items_v2(p_old_rota_id BIGINT, p_new_rota_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_start_timestamp TIMESTAMP WITH TIME ZONE;
    r RECORD;
    v_attended BOOLEAN;
BEGIN
    -- Get start date of the old route
    SELECT data_inicio INTO v_old_start_timestamp FROM "ROTA" WHERE id = p_old_rota_id;

    -- Iterate over items in the old route
    FOR r IN SELECT * FROM "ROTA_ITEMS" WHERE rota_id = p_old_rota_id LOOP
        v_attended := FALSE;

        -- Check 1: Recent Activity in BANCO_DE_DADOS (Sales/Acertos)
        -- We check if there is any record for this client created/updated after the route started
        -- Casting "DATA DO ACERTO" (text) to DATE to compare with timestamp's date part
        -- Using safe casting or assuming ISO format YYYY-MM-DD stored in text column
        
        PERFORM 1 FROM "BANCO_DE_DADOS"
        WHERE "CÓDIGO DO CLIENTE" = r.cliente_id
          AND (
            ("DATA DO ACERTO" IS NOT NULL AND "DATA DO ACERTO" >= v_old_start_timestamp::DATE::TEXT)
            OR
            ("DATA E HORA" IS NOT NULL AND "DATA E HORA" >= v_old_start_timestamp::TEXT)
          );
        
        IF FOUND THEN
            v_attended := TRUE;
        END IF;

        -- Check 2: Recent Activity in RECEBIMENTOS (Payments)
        IF NOT v_attended THEN
            PERFORM 1 FROM "RECEBIMENTOS"
            WHERE cliente_id = r.cliente_id
              AND created_at >= v_old_start_timestamp::TEXT;
            
            IF FOUND THEN
                v_attended := TRUE;
            END IF;
        END IF;

        -- If NOT attended, transfer item to new route
        IF NOT v_attended THEN
            -- We keep the same vendedor_id and x_na_rota
            -- Requirement: Persist the current x_na_rota value (do not increment it again during transfer)
            INSERT INTO "ROTA_ITEMS" (rota_id, cliente_id, vendedor_id, x_na_rota, boleto, agregado)
            VALUES (p_new_rota_id, r.cliente_id, r.vendedor_id, r.x_na_rota, r.boleto, r.agregado)
            ON CONFLICT (rota_id, cliente_id) DO UPDATE
            SET vendedor_id = EXCLUDED.vendedor_id,
                x_na_rota = EXCLUDED.x_na_rota,
                boleto = EXCLUDED.boleto,
                agregado = EXCLUDED.agregado;
        END IF;
    END LOOP;
END;
$$;
