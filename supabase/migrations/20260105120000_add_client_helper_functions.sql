-- Function to get unique client types for the dropdown
CREATE OR REPLACE FUNCTION get_unique_client_types()
RETURNS TABLE (tipo text)
LANGUAGE sql
AS $$
  SELECT DISTINCT "TIPO DE CLIENTE"
  FROM "CLIENTES"
  WHERE "TIPO DE CLIENTE" IS NOT NULL AND "TIPO DE CLIENTE" <> ''
  ORDER BY "TIPO DE CLIENTE";
$$;

-- Function to get unique expositores for the dropdown
CREATE OR REPLACE FUNCTION get_unique_expositores()
RETURNS TABLE (expositor text)
LANGUAGE sql
AS $$
  SELECT DISTINCT "EXPOSITOR"
  FROM "CLIENTES"
  WHERE "EXPOSITOR" IS NOT NULL AND "EXPOSITOR" <> ''
  ORDER BY "EXPOSITOR";
$$;
