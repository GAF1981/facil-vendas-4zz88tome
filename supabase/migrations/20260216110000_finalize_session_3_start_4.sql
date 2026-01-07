-- Migration to finalize Inventory Session 3 and start Session 4
-- Transfers final balances from Session 3 to initial balances of Session 4

DO $$
DECLARE
    v_session_3_exists boolean;
    v_session_4_exists boolean;
    v_session_3_status text;
BEGIN
    -- Check if session 3 exists
    SELECT EXISTS(SELECT 1 FROM "ID Inventário" WHERE id = 3) INTO v_session_3_exists;
    
    -- Check if session 3 is open
    IF v_session_3_exists THEN
        SELECT status INTO v_session_3_status FROM "ID Inventário" WHERE id = 3;
    END IF;

    -- Check if session 4 exists
    SELECT EXISTS(SELECT 1 FROM "ID Inventário" WHERE id = 4) INTO v_session_4_exists;

    -- Execute transition logic only if Session 3 exists and Session 4 does not
    IF v_session_3_exists AND NOT v_session_4_exists THEN
        
        -- 1. Close Session 3 (if not already closed)
        IF v_session_3_status = 'ABERTO' THEN
            UPDATE "ID Inventário" 
            SET status = 'FECHADO', data_fim = NOW() 
            WHERE id = 3;
        END IF;

        -- 2. Create Session 4
        INSERT INTO "ID Inventário" (id, data_inicio, status) 
        VALUES (4, NOW(), 'ABERTO');

        -- 3. Carry over balances from Session 3 (novo_saldo_final) to Session 4 (saldo_inicial)
        -- We join with PRODUTOS to get the denormalized fields required by ESTOQUE GERAL SALDO INICIAL
        INSERT INTO "ESTOQUE GERAL SALDO INICIAL" (
            id_inventario,
            produto_id,
            saldo_inicial,
            produto,
            preco,
            codigo_produto,
            barcode
        )
        SELECT
            4,                                      -- New Session ID
            a.produto_id,
            a.novo_saldo_final,                     -- Previous Final Balance becomes Initial
            p."PRODUTO",
            -- Safe parsing of currency string '1.234,56' -> 1234.56
            CASE 
                WHEN p."PREÇO" IS NULL OR p."PREÇO" = '' THEN 0
                ELSE CAST(REPLACE(REPLACE(p."PREÇO", '.', ''), ',', '.') AS NUMERIC)
            END,
            p."CODIGO",
            CAST(p."CÓDIGO BARRAS" AS TEXT)
        FROM "ESTOQUE GERAL AJUSTES" a
        JOIN "PRODUTOS" p ON a.produto_id = p."ID"
        WHERE a.id_inventario = 3;

    END IF;
END $$;
