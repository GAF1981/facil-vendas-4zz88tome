BEGIN;

-- 1. acoes_cobranca_vencimentos (Child of acoes_cobranca)
-- We must delete items where the parent acoes_cobranca is about to be deleted to maintain referential integrity.
DELETE FROM public."acoes_cobranca_vencimentos"
WHERE "acao_cobranca_id" IN (
    SELECT id FROM public."acoes_cobranca"
    WHERE "pedido_id" NOT IN (708, 609, 608, 607)
      AND "pedido_id" IS NOT NULL
);

-- 2. acoes_cobranca
DELETE FROM public."acoes_cobranca"
WHERE "pedido_id" NOT IN (708, 609, 608, 607)
  AND "pedido_id" IS NOT NULL;

-- 3. AÇOES DE COBRANÇA_BACKUP
DELETE FROM public."AÇOES DE COBRANÇA_BACKUP"
WHERE "NÚMERO DO PEDIDO" NOT IN (708, 609, 608, 607)
  AND "NÚMERO DO PEDIDO" IS NOT NULL;

-- 4. PIX
DELETE FROM public."PIX"
WHERE "venda_id" NOT IN (708, 609, 608, 607)
  AND "venda_id" IS NOT NULL;

-- 5. RECEBIMENTOS
DELETE FROM public."RECEBIMENTOS"
WHERE "venda_id" NOT IN (708, 609, 608, 607)
  AND "venda_id" IS NOT NULL;

-- 6. debitos_historico
DELETE FROM public."debitos_historico"
WHERE "pedido_id" NOT IN (708, 609, 608, 607)
  AND "pedido_id" IS NOT NULL;

-- 7. inativar_clientes
DELETE FROM public."inativar_clientes"
WHERE "pedido_id" NOT IN (708, 609, 608, 607)
  AND "pedido_id" IS NOT NULL;

-- 8. notas_fiscais_emitidas
DELETE FROM public."notas_fiscais_emitidas"
WHERE "pedido_id" NOT IN (708, 609, 608, 607)
  AND "pedido_id" IS NOT NULL;

-- 9. NOTA_FISCAL
DELETE FROM public."NOTA_FISCAL"
WHERE "venda_id" NOT IN (708, 609, 608, 607)
  AND "venda_id" IS NOT NULL;

-- 10. RELATORIO_DE_ESTOQUE
DELETE FROM public."RELATORIO_DE_ESTOQUE"
WHERE "numero_pedido" NOT IN (708, 609, 608, 607)
  AND "numero_pedido" IS NOT NULL;

-- 11. AJUSTE_SALDO_INICIAL
DELETE FROM public."AJUSTE_SALDO_INICIAL"
WHERE "numero_pedido" NOT IN (708, 609, 608, 607)
  AND "numero_pedido" IS NOT NULL;

-- 12. ESTOQUE GERAL SALDO INICIAL
DELETE FROM public."ESTOQUE GERAL SALDO INICIAL"
WHERE "pedido_id" NOT IN (708, 609, 608, 607)
  AND "pedido_id" IS NOT NULL;

-- 13. ESTOQUE CARRO tables
DELETE FROM public."ESTOQUE CARRO: CARRO PARA O CLIENTE"
WHERE "pedido" NOT IN (708, 609, 608, 607)
  AND "pedido" IS NOT NULL;

DELETE FROM public."ESTOQUE CARRO: CARRO PARA O ESTOQUE"
WHERE "pedido" NOT IN (708, 609, 608, 607)
  AND "pedido" IS NOT NULL;

DELETE FROM public."ESTOQUE CARRO: CLIENTE PARA O CARRO"
WHERE "pedido" NOT IN (708, 609, 608, 607)
  AND "pedido" IS NOT NULL;

DELETE FROM public."ESTOQUE CARRO: ESTOQUE PARA O CARRO"
WHERE "pedido" NOT IN (708, 609, 608, 607)
  AND "pedido" IS NOT NULL;

-- 14. BANCO_DE_DADOS
DELETE FROM public."BANCO_DE_DADOS"
WHERE "NÚMERO DO PEDIDO" NOT IN (708, 609, 608, 607)
  AND "NÚMERO DO PEDIDO" IS NOT NULL;

COMMIT;
