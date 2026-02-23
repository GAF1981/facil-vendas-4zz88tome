-- Migration to add delete_order_cascade and dias_excecao_metas

CREATE TABLE IF NOT EXISTS public.dias_excecao_metas (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL UNIQUE,
    descricao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.dias_excecao_metas ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Enable all access for authenticated users on dias_excecao_metas" 
    ON public.dias_excecao_metas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Delete Order Cascade RPC
CREATE OR REPLACE FUNCTION public.delete_order_cascade(p_order_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
    DELETE FROM "RECEBIMENTOS" WHERE venda_id = p_order_id;
    DELETE FROM "debitos_historico" WHERE pedido_id = p_order_id;
    DELETE FROM "RELATORIO_DE_ESTOQUE" WHERE numero_pedido = p_order_id;
    DELETE FROM "notas_fiscais_emitidas" WHERE pedido_id = p_order_id;
    DELETE FROM "inativar_clientes" WHERE pedido_id = p_order_id;
    DELETE FROM "AJUSTE_SALDO_INICIAL" WHERE numero_pedido = p_order_id;
    DELETE FROM "AÇOES DE COBRANÇA_BACKUP" WHERE "NÚMERO DO PEDIDO" = p_order_id;
    DELETE FROM "acoes_cobranca" WHERE pedido_id = p_order_id;
    DELETE FROM "NOTA_FISCAL" WHERE venda_id = p_order_id;
    DELETE FROM "BANCO_DE_DADOS" WHERE "NÚMERO DO PEDIDO" = p_order_id;
END;
$;

