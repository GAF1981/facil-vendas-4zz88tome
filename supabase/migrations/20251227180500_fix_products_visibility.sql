-- Ensure RLS is enabled on PRODUTOS table
ALTER TABLE "PRODUTOS" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure a clean state and avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "PRODUTOS";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "PRODUTOS";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "PRODUTOS";
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON "PRODUTOS";

-- Create comprehensive policies for authenticated users
-- This resolves the data visibility issue by explicitly allowing SELECT for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON "PRODUTOS"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users" ON "PRODUTOS"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON "PRODUTOS"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete for authenticated users" ON "PRODUTOS"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (true);
