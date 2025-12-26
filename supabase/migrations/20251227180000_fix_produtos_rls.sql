-- Enable RLS for PRODUTOS table to ensure data is accessible but protected
ALTER TABLE "PRODUTOS" ENABLE ROW LEVEL SECURITY;

-- Policy to allow read access for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON "PRODUTOS"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

-- Policy to allow insert for authenticated users
CREATE POLICY "Enable insert for authenticated users" ON "PRODUTOS"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy to allow update for authenticated users
CREATE POLICY "Enable update for authenticated users" ON "PRODUTOS"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (true);

-- Policy to allow delete for authenticated users
CREATE POLICY "Enable delete for authenticated users" ON "PRODUTOS"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (true);
