-- Migration to revert complex inventory movement logic and stabilize the table
-- Addresses User Story: Revert inventory movement calculations based on date/time comparisons

-- Revert get_inventory_items_paginated to simple fetch, zeroing out client movements
CREATE OR REPLACE FUNCTION get_inventory_items_paginated(
  p_session_id BIGINT DEFAULT NULL,
  p_funcionario_id BIGINT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  codigo_barras TEXT,
  codigo_produto BIGINT,
  mercadoria TEXT,
  tipo TEXT,
  preco NUMERIC,
  saldo_inicial NUMERIC,
  entrada_estoque_carro NUMERIC,
  entrada_cliente_carro NUMERIC,
  saida_carro_estoque NUMERIC,
  saida_carro_cliente NUMERIC,
  saldo_final NUMERIC,
  estoque_contagem_carro NUMERIC,
  total_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_offset INT;
  v_total_count BIGINT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  -- Calculate Total Count
  SELECT COUNT(*)
  INTO v_total_count
  FROM "BANCO_DE_DADOS" bd
  LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
  WHERE 
    (p_session_id IS NULL OR bd.session_id = p_session_id)
    AND
    (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
    AND
    (p_search IS NULL OR 
     COALESCE(p."PRODUTO", '') ILIKE '%' || p_search || '%' OR
     COALESCE(bd."MERCADORIA", '') ILIKE '%' || p_search || '%'
    );

  RETURN QUERY
  WITH base_data AS (
    SELECT
      p."ID" as p_id,
      p."CÓDIGO BARRAS"::TEXT as p_codigo_barras,
      bd."COD. PRODUTO" as p_codigo_produto,
      
      COALESCE(
        p."PRODUTO", 
        bd."MERCADORIA", 
        'Produto Não Identificado (ID: ' || COALESCE(bd."COD. PRODUTO"::TEXT, '?') || ')'
      ) as p_mercadoria,
      
      COALESCE(p."TIPO", 'OUTROS') as p_tipo,
      
      parse_currency_sql(COALESCE(p."PREÇO"::TEXT, '0')) as p_preco,
      
      COALESCE(bd."SALDO INICIAL", 0) as bd_saldo_inicial,
      COALESCE(bd."SALDO FINAL", 0) as bd_saldo_final,
      
      -- Stock -> Car (Repo) - Keep from BD row
      parse_currency_sql(bd."NOVAS CONSIGNAÇÕES") as bd_entrada_estoque_carro,
      
      -- Car -> Stock (Devolucao) - Keep from BD row
      parse_currency_sql(bd."RECOLHIDO") as bd_saida_carro_estoque,

      -- Client -> Car (Reverted to 0 as per user story)
      0::NUMERIC as bd_entrada_cliente_carro,
      
      -- Car -> Client (Reverted to 0 as per user story)
      0::NUMERIC as bd_saida_carro_cliente,
      
      COALESCE(cfe.quantidade, bd."CONTAGEM", 0) as final_contagem
      
    FROM "BANCO_DE_DADOS" bd
    LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
    LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
      ON cfe.produto_id = p."ID" AND cfe.session_id = bd.session_id
    WHERE 
      (p_session_id IS NULL OR bd.session_id = p_session_id)
      AND
      (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
      AND
      (p_search IS NULL OR 
       COALESCE(p."PRODUTO", '') ILIKE '%' || p_search || '%' OR
       COALESCE(bd."MERCADORIA", '') ILIKE '%' || p_search || '%'
      )
  )
  SELECT
    COALESCE(p_id, p_codigo_produto, 0) as id,
    p_codigo_barras,
    p_codigo_produto,
    p_mercadoria,
    p_tipo,
    p_preco,
    bd_saldo_inicial,
    bd_entrada_estoque_carro,
    bd_entrada_cliente_carro,
    bd_saida_carro_estoque,
    bd_saida_carro_cliente,
    bd_saldo_final,
    final_contagem,
    v_total_count
  FROM base_data
  ORDER BY p_mercadoria ASC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- Revert get_inventory_data to simple fetch (no date logic)
CREATE OR REPLACE FUNCTION get_inventory_data(
  p_session_id INTEGER,
  p_funcionario_id INTEGER
)
RETURNS TABLE (
  id INTEGER,
  codigo_barras TEXT,
  codigo_produto INTEGER,
  mercadoria TEXT,
  tipo TEXT,
  preco NUMERIC,
  saldo_inicial NUMERIC,
  saldo_final NUMERIC,
  contagem NUMERIC,
  entrada_estoque_carro NUMERIC,
  saida_carro_estoque NUMERIC,
  entrada_cliente_carro NUMERIC,
  saida_carro_cliente NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p."ID", bd."COD. PRODUTO")::INTEGER as id,
    p."CÓDIGO BARRAS"::TEXT as codigo_barras,
    bd."COD. PRODUTO"::INTEGER as codigo_produto,
    COALESCE(p."PRODUTO", bd."MERCADORIA", 'N/D') as mercadoria,
    p."TIPO" as tipo,
    parse_currency_sql(p."PREÇO"::TEXT) as preco,
    COALESCE(bd."SALDO INICIAL", 0) as saldo_inicial,
    COALESCE(bd."SALDO FINAL", 0) as saldo_final,
    COALESCE(cfe.quantidade, bd."CONTAGEM", 0) as contagem,
    -- Repo
    parse_currency_sql(bd."NOVAS CONSIGNAÇÕES") as entrada_estoque_carro,
    -- Devolucao
    parse_currency_sql(bd."RECOLHIDO") as saida_carro_estoque,
    -- Zeroed client movements
    0::NUMERIC as entrada_cliente_carro,
    0::NUMERIC as saida_carro_cliente
  FROM "BANCO_DE_DADOS" bd
  LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
  LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
      ON cfe.produto_id = p."ID" AND cfe.session_id = bd.session_id
  WHERE 
    (p_session_id IS NULL OR bd.session_id = p_session_id) AND
    (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
  ORDER BY mercadoria;
END;
$$;
