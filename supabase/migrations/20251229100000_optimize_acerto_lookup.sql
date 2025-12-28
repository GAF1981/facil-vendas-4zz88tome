-- Create an index to optimize the lookup of the last settlement (acerto) for a client
-- This helps the query that filters by "COD. CLIENTE" and orders by date/time
CREATE INDEX IF NOT EXISTS idx_banco_de_dados_cliente_data_acerto 
ON "BANCO_DE_DADOS" ("COD. CLIENTE", "DATA DO ACERTO" DESC, "HORA DO ACERTO" DESC);
