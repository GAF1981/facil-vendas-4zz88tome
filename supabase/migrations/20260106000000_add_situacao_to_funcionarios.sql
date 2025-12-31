ALTER TABLE "public"."FUNCIONARIOS" ADD COLUMN "situacao" text NOT NULL DEFAULT 'ATIVO';
ALTER TABLE "public"."FUNCIONARIOS" ADD CONSTRAINT "funcionarios_situacao_check" CHECK (situacao IN ('ATIVO', 'INATIVO'));
