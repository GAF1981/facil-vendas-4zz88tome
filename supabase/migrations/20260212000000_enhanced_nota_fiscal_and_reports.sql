-- Create table for issued invoices
CREATE TABLE IF NOT EXISTS public.notas_fiscais_emitidas (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL,
    numero_nota_fiscal TEXT NOT NULL,
    data_emissao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    funcionario_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add solicitacao_nf column to BANCO_DE_DADOS
ALTER TABLE public."BANCO_DE_DADOS" ADD COLUMN IF NOT EXISTS solicitacao_nf TEXT DEFAULT 'NÃO';

-- Add columns to debitos_historico for Report enhancement
ALTER TABLE public.debitos_historico ADD COLUMN IF NOT EXISTS cliente_codigo INTEGER;
ALTER TABLE public.debitos_historico ADD COLUMN IF NOT EXISTS cliente_nome TEXT;
ALTER TABLE public.debitos_historico ADD COLUMN IF NOT EXISTS rota TEXT;
ALTER TABLE public.debitos_historico ADD COLUMN IF NOT EXISTS hora_acerto TEXT;

-- Backfill debitos_historico with data from BANCO_DE_DADOS and CLIENTES
DO $$
BEGIN
    UPDATE public.debitos_historico dh
    SET 
        cliente_codigo = sub.cliente_codigo,
        cliente_nome = sub.cliente_nome,
        hora_acerto = sub.hora_acerto
    FROM (
        SELECT 
            "NÚMERO DO PEDIDO" as pedido_id, 
            MAX("CÓDIGO DO CLIENTE") as cliente_codigo, 
            MAX("CLIENTE") as cliente_nome, 
            MAX("HORA DO ACERTO") as hora_acerto
        FROM public."BANCO_DE_DADOS"
        GROUP BY "NÚMERO DO PEDIDO"
    ) sub
    WHERE dh.pedido_id = sub.pedido_id
    AND (dh.cliente_codigo IS NULL OR dh.cliente_nome IS NULL);

    UPDATE public.debitos_historico dh
    SET rota = c."GRUPO ROTA"
    FROM public."CLIENTES" c
    WHERE dh.cliente_codigo = c."CODIGO"
    AND dh.rota IS NULL;
END $$;
