CREATE TABLE IF NOT EXISTS public.metas_periodos (
    id SERIAL PRIMARY KEY,
    funcionario_id INTEGER NOT NULL REFERENCES public."FUNCIONARIOS"(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    valor_meta NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.metas_periodos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON public.metas_periodos
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
