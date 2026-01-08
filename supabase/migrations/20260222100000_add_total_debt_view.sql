-- Create a view that includes the total debt per client calculated via window function
-- This allows for efficient fetching of the total debt without separate queries
CREATE OR REPLACE VIEW debitos_com_total_view AS
SELECT
    id,
    rota_id,
    pedido_id,
    data_acerto,
    hora_acerto,
    vendedor_nome,
    cliente_codigo,
    cliente_nome,
    rota,
    media_mensal,
    valor_venda,
    desconto,
    saldo_a_pagar,
    valor_pago,
    debito,
    created_at,
    -- Window function to sum debt partitioning by client code
    SUM(debito) OVER (PARTITION BY cliente_codigo) as debito_total
FROM debitos_historico;
