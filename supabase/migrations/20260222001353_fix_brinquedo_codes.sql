-- Fix inverted product codes for "brinquedo 19,99"
DO $
DECLARE
    v_produto_id INTEGER;
BEGIN
    SELECT "ID" INTO v_produto_id FROM "PRODUTOS" WHERE "PRODUTO" ILIKE '%brinquedo 19,99%' LIMIT 1;
    
    IF v_produto_id IS NOT NULL THEN
        -- Fix PRODUTOS table
        UPDATE "PRODUTOS"
        SET 
            "codigo_interno" = '9000013',
            "CÓDIGO BARRAS" = '9788532241054'
        WHERE "ID" = v_produto_id;

        -- Fix historical tables where barcode was inverted
        UPDATE "ESTOQUE CARRO SALDO INICIAL"
        SET barcode = '9788532241054', codigo_produto = 9000013
        WHERE produto_id = v_produto_id;

        UPDATE "ESTOQUE CARRO SALDO FINAL"
        SET barcode = '9788532241054', codigo_produto = 9000013
        WHERE produto_id = v_produto_id;

        UPDATE "ESTOQUE CARRO: CARRO PARA O CLIENTE"
        SET barcode = '9788532241054', codigo_produto = 9000013
        WHERE produto_id = v_produto_id;

        UPDATE "ESTOQUE CARRO: CLIENTE PARA O CARRO"
        SET barcode = '9788532241054', codigo_produto = 9000013
        WHERE produto_id = v_produto_id;

        UPDATE "ESTOQUE GERAL SALDO INICIAL"
        SET barcode = '9788532241054', codigo_produto = 9000013
        WHERE produto_id = v_produto_id;
    END IF;
END $;

