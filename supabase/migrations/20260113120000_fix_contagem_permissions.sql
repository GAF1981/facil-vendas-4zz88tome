-- Enable RLS on CONTAGEM DE ESTOQUE FINAL
ALTER TABLE "CONTAGEM DE ESTOQUE FINAL" ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "CONTAGEM DE ESTOQUE FINAL";

-- Create policy allowing full access for authenticated users
CREATE POLICY "Enable all for authenticated users" ON "CONTAGEM DE ESTOQUE FINAL"
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant permissions to authenticated role and service_role
GRANT ALL ON "CONTAGEM DE ESTOQUE FINAL" TO authenticated;
GRANT ALL ON "CONTAGEM DE ESTOQUE FINAL" TO service_role;
