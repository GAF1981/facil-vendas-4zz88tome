-- Fix Order 708
UPDATE "BANCO_DE_DADOS"
SET "DESCONTO POR GRUPO" = '167.62'
WHERE "NÚMERO DO PEDIDO" = 708;

-- Fix Order 776
UPDATE "BANCO_DE_DADOS"
SET "DESCONTO POR GRUPO" = '208.11'
WHERE "NÚMERO DO PEDIDO" = 776;

-- Fix Order 778
UPDATE "BANCO_DE_DADOS"
SET "DESCONTO POR GRUPO" = '263.77'
WHERE "NÚMERO DO PEDIDO" = 778;

-- Recalculate historical debits for the affected orders
DO $$
BEGIN
    -- Call the update_debito_historico_order function for each updated order
    -- Using PERFORM to execute the function and discard the result
    PERFORM public.update_debito_historico_order(708);
    PERFORM public.update_debito_historico_order(776);
    PERFORM public.update_debito_historico_order(778);
END $$;

-- Force debt to 0 and align saldo_a_pagar with valor_pago for consistency
-- This ensures that if the automatic recalculation does not result in exactly 0.00
-- due to legacy inverted values, the debt is cleared and reports match.
UPDATE debitos_historico
SET 
    debito = 0,
    saldo_a_pagar = valor_pago
WHERE pedido_id IN (708, 776, 778);
