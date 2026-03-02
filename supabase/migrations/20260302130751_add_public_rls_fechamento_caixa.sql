-- Add policy to allow public access for all operations on fechamento_caixa
-- This resolves the 42501 RLS error during upsert when using the anon key
-- and aligns with the public access model of other tables like CLIENTES and DESPESAS.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fechamento_caixa' 
        AND policyname = 'Enable all access for all users'
    ) THEN
        CREATE POLICY "Enable all access for all users" 
        ON "public"."fechamento_caixa"
        FOR ALL 
        TO public 
        USING (true) 
        WITH CHECK (true);
    END IF;
END
$$;
