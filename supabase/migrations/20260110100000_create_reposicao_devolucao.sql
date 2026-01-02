CREATE TABLE "REPOSIÇÃO E DEVOLUÇÃO" (
  "id" SERIAL PRIMARY KEY,
  "TIPO" TEXT NOT NULL CHECK ("TIPO" IN ('REPOSICAO', 'DEVOLUCAO')),
  "funcionario_id" INTEGER REFERENCES "FUNCIONARIOS"("id"),
  "produto_id" INTEGER REFERENCES "PRODUTOS"("ID"),
  "quantidade" INTEGER NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "session_id" INTEGER REFERENCES "DATAS DE INVENTÁRIO"("ID INVENTÁRIO")
);

-- Enable RLS
ALTER TABLE "REPOSIÇÃO E DEVOLUÇÃO" ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable all for authenticated users" ON "REPOSIÇÃO E DEVOLUÇÃO"
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
