CREATE TABLE IF NOT EXISTS debitos_historico (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER,
    pedido_id INTEGER NOT NULL,
    data_acerto TIMESTAMP,
    vendedor_nome TEXT,
    media_mensal NUMERIC,
    valor_venda NUMERIC,
    saldo_a_pagar NUMERIC,
    valor_pago NUMERIC,
    debito NUMERIC,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION refresh_debitos_historico()
RETURNS VOID
LANGUAGE plpgsql
AS $
BEGIN
    DELETE FROM debitos_historico;

    INSERT INTO debitos_historico (
        rota_id,
        pedido_id,
        data_acerto,
        vendedor_nome,
        media_mensal,
        valor_venda,
        saldo_a_pagar,
        valor_pago,
        debito
    )
    SELECT
        NULL as rota_id, -- Rota ID logic is complex to derive historically without Rota Items join, leaving NULL or mapping if possible
        bd."NÚMERO DO PEDIDO",
        CAST(bd."DATA DO ACERTO" AS TIMESTAMP),
        bd."FUNCIONÁRIO",
        0, -- Placeholder for media monthly calculation which is complex in SQL
        public.parse_currency_sql(bd."VALOR VENDIDO"),
        public.parse_currency_sql(bd."VALOR DEVIDO"), -- Assuming this column exists and is populated
        COALESCE(SUM(r.valor_pago), 0),
        (public.parse_currency_sql(bd."VALOR DEVIDO") - COALESCE(SUM(r.valor_pago), 0))
    FROM "BANCO_DE_DADOS" bd
    LEFT JOIN "RECEBIMENTOS" r ON bd."NÚMERO DO PEDIDO" = r.venda_id
    WHERE bd."NÚMERO DO PEDIDO" IS NOT NULL
    GROUP BY bd."NÚMERO DO PEDIDO", bd."DATA DO ACERTO", bd."FUNCIONÁRIO", bd."VALOR VENDIDO", bd."VALOR DEVIDO";
END;
$;

