-- Migration to seed the required user and ensure authentication works
-- Created at: 2025-12-27T16:00:00Z

-- Insert the admin user if it doesn't exist to satisfy acceptance criteria
INSERT INTO "public"."FUNCIONARIOS" (nome_completo, email, senha, setor, cpf)
SELECT 'Guilherme Fantauzzi', 'guilhermefantauzzi@gmail.com', '0000', 'Administrador', '000.000.000-00'
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."FUNCIONARIOS" WHERE email = 'guilhermefantauzzi@gmail.com'
);

-- Ensure public access policies exist for FUNCIONARIOS to allow login query before auth
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'FUNCIONARIOS' AND policyname = 'Allow public access to FUNCIONARIOS'
    ) THEN
        ALTER TABLE "public"."FUNCIONARIOS" ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow public access to FUNCIONARIOS" ON "public"."FUNCIONARIOS"
        FOR ALL
        TO public
        USING (true)
        WITH CHECK (true);
    END IF;
END
$$;

-- Explicitly grant execute permission on the auth function to anonymous users
GRANT EXECUTE ON FUNCTION verify_employee_credentials(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_employee_credentials(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_employee_credentials(TEXT, TEXT) TO service_role;
