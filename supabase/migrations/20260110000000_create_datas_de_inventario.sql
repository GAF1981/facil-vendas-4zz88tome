CREATE TABLE "DATAS DE INVENTÁRIO" (
  "ID INVENTÁRIO" SERIAL PRIMARY KEY,
  "Data de Início de Inventário" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "Data de Fechamento de Inventário" TIMESTAMP WITH TIME ZONE,
  "TIPO" TEXT,
  "CODIGO FUNCIONARIO" INTEGER
);

-- Enable RLS
ALTER TABLE "DATAS DE INVENTÁRIO" ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (full access for now as per app pattern)
CREATE POLICY "Enable all for authenticated users" ON "DATAS DE INVENTÁRIO"
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
