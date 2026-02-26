-- Enable RLS for fechamento_caixa table
ALTER TABLE "public"."fechamento_caixa" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to perform all operations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fechamento_caixa' 
        AND policyname = 'Enable all access for authenticated users'
    ) THEN
        CREATE POLICY "Enable all access for authenticated users" 
        ON "public"."fechamento_caixa"
        FOR ALL 
        TO authenticated 
        USING (true) 
        WITH CHECK (true);
    END IF;
END
$$;
