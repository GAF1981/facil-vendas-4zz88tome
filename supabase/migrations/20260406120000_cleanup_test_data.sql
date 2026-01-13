BEGIN;

-- 1. Remove from acoes_cobranca_vencimentos (linked to acoes_cobranca)
DELETE FROM public."acoes_cobranca_vencimentos"
WHERE "acao_cobranca_id" IN (
    SELECT id FROM public."acoes_cobranca" WHERE "pedido_id" BETWEEN 1 AND 360
);

-- 2. Remove from acoes_cobranca
DELETE FROM public."acoes_cobranca"
WHERE "pedido_id" BETWEEN 1 AND 360;

-- 3. Remove from PIX
-- Deleting separately to ensure all links via venda_id are cleared, even if cascade from RECEBIMENTOS would handle some.
DELETE FROM public."PIX"
WHERE "venda_id" BETWEEN 1 AND 360;

-- 4. Remove from RECEBIMENTOS
DELETE FROM public."RECEBIMENTOS"
WHERE "venda_id" BETWEEN 1 AND 360;

-- 5. Remove from BANCO_DE_DADOS
DELETE FROM public."BANCO_DE_DADOS"
WHERE "NÚMERO DO PEDIDO" BETWEEN 1 AND 360;

-- 6. Remove from debitos_historico
DELETE FROM public."debitos_historico"
WHERE "pedido_id" BETWEEN 1 AND 360;

-- 7. Remove from AJUSTE_SALDO_INICIAL
DELETE FROM public."AJUSTE_SALDO_INICIAL"
WHERE "numero_pedido" BETWEEN 1 AND 360;

-- 8. Remove from inativar_clientes
DELETE FROM public."inativar_clientes"
WHERE "pedido_id" BETWEEN 1 AND 360;

-- 9. Remove from NOTA_FISCAL
DELETE FROM public."NOTA_FISCAL"
WHERE "venda_id" BETWEEN 1 AND 360;

-- 10. Remove from notas_fiscais_emitidas
DELETE FROM public."notas_fiscais_emitidas"
WHERE "pedido_id" BETWEEN 1 AND 360;

-- 11. Remove from ESTOQUE CARRO: CARRO PARA O CLIENTE
DELETE FROM public."ESTOQUE CARRO: CARRO PARA O CLIENTE"
WHERE "pedido" BETWEEN 1 AND 360;

-- 12. Remove from ESTOQUE CARRO: CARRO PARA O ESTOQUE
DELETE FROM public."ESTOQUE CARRO: CARRO PARA O ESTOQUE"
WHERE "pedido" BETWEEN 1 AND 360;

-- 13. Remove from ESTOQUE CARRO: CLIENTE PARA O CARRO
DELETE FROM public."ESTOQUE CARRO: CLIENTE PARA O CARRO"
WHERE "pedido" BETWEEN 1 AND 360;

-- 14. Remove from ESTOQUE CARRO: ESTOQUE PARA O CARRO
DELETE FROM public."ESTOQUE CARRO: ESTOQUE PARA O CARRO"
WHERE "pedido" BETWEEN 1 AND 360;

-- 15. Remove from RELATORIO_DE_ESTOQUE
DELETE FROM public."RELATORIO_DE_ESTOQUE"
WHERE "numero_pedido" BETWEEN 1 AND 360;

-- 16. Remove from QUANTIDADE DE ESTOQUE FINAL
DELETE FROM public."QUANTIDADE DE ESTOQUE FINAL"
WHERE "NUMERO DO PEDIDO" BETWEEN 1 AND 360;

-- 17. Remove from ESTOQUE GERAL SALDO INICIAL
DELETE FROM public."ESTOQUE GERAL SALDO INICIAL"
WHERE "pedido_id" BETWEEN 1 AND 360;

COMMIT;
