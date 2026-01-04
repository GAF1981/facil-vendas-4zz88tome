-- Migration to fix RPC return types for multi-sector support
-- The 'setor' column in FUNCIONARIOS table is now text[], but the RPCs were returning text.

-- 1. Update verify_employee_credentials
DROP FUNCTION IF EXISTS verify_employee_credentials(text, text);

CREATE OR REPLACE FUNCTION verify_employee_credentials(p_email text, p_senha text)
RETURNS TABLE (
  id bigint,
  email text,
  nome_completo text,
  setor text[],
  foto_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT f.id, f.email, f.nome_completo, f.setor, f.foto_url
  FROM "public"."FUNCIONARIOS" f
  WHERE f.email = p_email AND f.senha = p_senha
  LIMIT 1;
END;
$function$;

GRANT EXECUTE ON FUNCTION verify_employee_credentials(text, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_employee_credentials(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_employee_credentials(text, text) TO service_role;


-- 2. Update login_by_email
DROP FUNCTION IF EXISTS login_by_email(text);

CREATE OR REPLACE FUNCTION login_by_email(p_email text)
RETURNS TABLE (
  id integer,
  nome_completo text,
  apelido text,
  cpf text,
  email text,
  setor text[],
  foto_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.nome_completo,
    f.apelido,
    f.cpf,
    f.email,
    f.setor,
    f.foto_url
  FROM public."FUNCIONARIOS" f
  WHERE f.email ILIKE p_email;
END;
$function$;

GRANT EXECUTE ON FUNCTION login_by_email(text) TO anon;
GRANT EXECUTE ON FUNCTION login_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION login_by_email(text) TO service_role;
