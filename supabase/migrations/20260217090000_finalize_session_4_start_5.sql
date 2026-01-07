-- Migration to finalize Inventory Session 4 and start Session 5
-- Transfers final balances from Session 4 to initial balances of Session 5

DO $$
DECLARE
    v_session_4_exists boolean;
    v_session_5_exists boolean;
    v_session_4_status text;
BEGIN
    -- Check if session 4 exists
    SELECT EXISTS(SELECT 1 FROM "ID Inventário" WHERE id = 4) INTO v_session_4_exists;
    
    -- Check if session 4 is open
    IF v_session_4_exists THEN
        SELECT status INTO v_session_4_status FROM "ID Inventário" WHERE id = 4;
    END IF;

    -- Check if session 5 exists
    SELECT EXISTS(SELECT 1 FROM "ID Inventário" WHERE id = 5) INTO v_session_5_exists;

    -- Execute transition logic only if Session 4 exists and Session 5 does not
    IF v_session_4_exists AND NOT v_session_5_exists THEN
        
        -- 1. Close Session 4 (if not already closed)
        IF v_session_4_status = 'ABERTO' THEN
            UPDATE "ID Inventário" 
            SET status = 'FECHADO', data_fim = NOW() 
            WHERE id = 4;
        END IF;

        -- 2. Create Session 5
        INSERT INTO "ID Inventário" (id, data_inicio, status) 
        VALUES (5, NOW(), 'ABERTO');

        -- 3. Carry over balances from Session 4 (novo_saldo_final) to Session 5 (saldo_inicial)
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
            5,                                      -- New Session ID
            a.produto_id,
            a.novo_saldo_final,                     -- Previous Final Balance becomes Initial
            p."PRODUTO",
            -- Safe parsing of currency string
            CASE 
                WHEN p."PREÇO" IS NULL OR p."PREÇO" = '' THEN 0
                ELSE CAST(REPLACE(REPLACE(p."PREÇO", '.', ''), ',', '.') AS NUMERIC)
            END,
            p."CODIGO",
            CAST(p."CÓDIGO BARRAS" AS TEXT)
        FROM "ESTOQUE GERAL AJUSTES" a
        JOIN "PRODUTOS" p ON a.produto_id = p."ID"
        WHERE a.id_inventario = 4;

    END IF;
END $$;
