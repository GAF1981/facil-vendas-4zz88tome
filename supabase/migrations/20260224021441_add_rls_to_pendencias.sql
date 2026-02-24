-- Enable RLS on PENDENCIAS table
ALTER TABLE public."PENDENCIAS" ENABLE ROW LEVEL SECURITY;

-- Add SELECT policy for authenticated users
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public."PENDENCIAS";
CREATE POLICY "Enable read access for authenticated users"
  ON public."PENDENCIAS"
  FOR SELECT
  TO authenticated
  USING (true);

-- Add INSERT policy for authenticated users
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public."PENDENCIAS";
CREATE POLICY "Enable insert access for authenticated users"
  ON public."PENDENCIAS"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy for authenticated users
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public."PENDENCIAS";
CREATE POLICY "Enable update access for authenticated users"
  ON public."PENDENCIAS"
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add DELETE policy for authenticated users
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public."PENDENCIAS";
CREATE POLICY "Enable delete access for authenticated users"
  ON public."PENDENCIAS"
  FOR DELETE
  TO authenticated
  USING (true);
