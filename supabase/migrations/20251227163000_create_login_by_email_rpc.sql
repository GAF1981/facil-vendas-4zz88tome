CREATE OR REPLACE FUNCTION login_by_email(p_email text)
RETURNS TABLE (
  id integer,
  nome_completo text,
  apelido text,
  cpf text,
  email text,
  setor text,
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
