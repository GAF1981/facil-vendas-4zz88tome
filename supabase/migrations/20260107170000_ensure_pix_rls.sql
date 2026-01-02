-- Enable RLS for PIX table
ALTER TABLE "PIX" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "PIX";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "PIX";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "PIX";

-- Create policies for PIX
CREATE POLICY "Enable read access for authenticated users" ON "PIX"
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON "PIX"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON "PIX"
    FOR UPDATE
    TO authenticated
    USING (true);

-- Ensure RECEBIMENTOS permissions for status updates
ALTER TABLE "RECEBIMENTOS" ENABLE ROW LEVEL SECURITY;

-- We add update policy for RECEBIMENTOS if strictly necessary for the flow, 
-- assuming read is likely already covered or needed as well.
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "RECEBIMENTOS";
CREATE POLICY "Enable update for authenticated users" ON "RECEBIMENTOS"
    FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "RECEBIMENTOS";
CREATE POLICY "Enable read access for authenticated users" ON "RECEBIMENTOS"
    FOR SELECT
    TO authenticated
    USING (true);
