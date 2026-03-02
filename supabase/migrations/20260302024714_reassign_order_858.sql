-- Reassign Order #858 from Route 47 to Route 46
DO $$
DECLARE
    v_new_rota_name text;
BEGIN
    -- Retrieve the route name for Route 46 to maintain consistency in debitos_historico
    SELECT nome_rota INTO v_new_rota_name 
    FROM "CRIAR_NOVA_ROTA" 
    WHERE id = 46 
    LIMIT 1;

    -- Update receipts (RECEBIMENTOS) to point to the new route
    UPDATE "RECEBIMENTOS"
    SET rota_id = 46
    WHERE venda_id = 858;

    -- Update debt history (debitos_historico) to the new route ID and name
    UPDATE debitos_historico
    SET 
        rota_id = 46,
        rota = COALESCE(v_new_rota_name, rota)
    WHERE pedido_id = 858;

END $$;
