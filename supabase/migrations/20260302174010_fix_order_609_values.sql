DO $$
BEGIN
    -- Update the discount value for Order 609
    UPDATE public."BANCO_DE_DADOS"
    SET "DESCONTO POR GRUPO" = '187,10'
    WHERE "NÚMERO DO PEDIDO" = 609
      AND "CLIENTE" ILIKE '%mercearia da branca%';

    -- Recalculate the debt history for Order 609 to reflect the correct discount and debt
    PERFORM public.update_debito_historico_order(609);
END $$;
