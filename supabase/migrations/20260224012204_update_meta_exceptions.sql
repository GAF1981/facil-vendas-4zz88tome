ALTER TABLE public.meta_excecoes RENAME COLUMN data TO data_inicio;
ALTER TABLE public.meta_excecoes ADD COLUMN data_fim DATE;
UPDATE public.meta_excecoes SET data_fim = data_inicio WHERE data_fim IS NULL;
ALTER TABLE public.meta_excecoes ALTER COLUMN data_fim SET NOT NULL;
ALTER TABLE public.meta_excecoes ADD COLUMN funcionario_id BIGINT REFERENCES public."FUNCIONARIOS"(id) ON DELETE CASCADE;
