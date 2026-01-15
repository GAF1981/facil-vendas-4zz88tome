CREATE OR REPLACE VIEW view_delivery_history AS
SELECT
    e.id,
    e.id_estoque_carro,
    COALESCE(e.data_horario::timestamp, e.created_at) as data_movimento,
    e.pedido,
    e.codigo_produto,
    e.produto,
    COALESCE(e.quantidade, e."SAIDAS_carro_cliente") as quantidade,
    e.funcionario,
    orders.codigo_cliente,
    orders.nome_cliente
FROM "ESTOQUE CARRO: CARRO PARA O CLIENTE" e
LEFT JOIN (
    SELECT DISTINCT "NÚMERO DO PEDIDO" as pedido, "CÓDIGO DO CLIENTE" as codigo_cliente, "CLIENTE" as nome_cliente
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" IS NOT NULL
) orders ON e.pedido = orders.pedido;
