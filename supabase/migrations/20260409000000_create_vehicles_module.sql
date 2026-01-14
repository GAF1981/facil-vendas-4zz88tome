CREATE TABLE "VEICULOS" (
    "id" SERIAL PRIMARY KEY,
    "placa" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
    "hodometro_cadastro" NUMERIC DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "DESPESAS" ADD COLUMN "veiculo_id" INTEGER REFERENCES "VEICULOS"("id");

-- Add permissions for the new module
INSERT INTO "permissoes" ("setor", "modulo", "acesso")
SELECT DISTINCT "setor", 'Veículos', true
FROM "permissoes"
ON CONFLICT ("setor", "modulo") DO NOTHING;
