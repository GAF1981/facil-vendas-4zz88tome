CREATE TABLE IF NOT EXISTS meta_excecoes (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE metas_funcionarios ADD COLUMN IF NOT EXISTS meta_mensal NUMERIC;

CREATE OR REPLACE FUNCTION public.delete_full_order(p_order_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM "BANCO_DE_DADOS" WHERE "NÚMERO DO PEDIDO" = p_order_id;
  DELETE FROM "RECEBIMENTOS" WHERE venda_id = p_order_id;
  DELETE FROM "debitos_historico" WHERE pedido_id = p_order_id;
  DELETE FROM "RELATORIO_DE_ESTOQUE" WHERE numero_pedido = p_order_id;
  DELETE FROM "notas_fiscais_emitidas" WHERE pedido_id = p_order_id;
  DELETE FROM "inativar_clientes" WHERE pedido_id = p_order_id;
  DELETE FROM "AJUSTE_SALDO_INICIAL" WHERE numero_pedido = p_order_id;
  DELETE FROM "AÇOES DE COBRANÇA_BACKUP" WHERE "NÚMERO DO PEDIDO" = p_order_id;
  DELETE FROM "acoes_cobranca" WHERE pedido_id = p_order_id;
END;
$$;
