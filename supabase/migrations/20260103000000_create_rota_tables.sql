CREATE TABLE IF NOT EXISTS "ROTA" (
  id SERIAL PRIMARY KEY,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "ROTA_ITEMS" (
  id SERIAL PRIMARY KEY,
  rota_id INTEGER REFERENCES "ROTA"(id),
  cliente_id INTEGER REFERENCES "CLIENTES"("CODIGO"),
  x_na_rota INTEGER DEFAULT 0,
  boleto BOOLEAN DEFAULT FALSE,
  agregado BOOLEAN DEFAULT FALSE,
  vendedor_id INTEGER REFERENCES "FUNCIONARIOS"(id),
  UNIQUE(rota_id, cliente_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_rota_items_rota_id ON "ROTA_ITEMS"(rota_id);
CREATE INDEX IF NOT EXISTS idx_rota_items_cliente_id ON "ROTA_ITEMS"(cliente_id);
