DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Hide function body for functions that contain 'val_str' in their source
  -- PostgREST exposes LANGUAGE sql function bodies if they don't have a comment,
  -- which causes multiline syntax errors in the generated TypeScript types.
  FOR rec IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosrc ILIKE '%val_str%'
  LOOP
    EXECUTE format('COMMENT ON FUNCTION %s IS ''Parses a string into a numeric value'';', rec.sig);
  END LOOP;

  -- Clear any existing function comments that contain the broken string
  FOR rec IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_description d
    JOIN pg_proc p ON p.oid = d.objoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND d.description ILIKE '%val_str%'
  LOOP
    EXECUTE format('COMMENT ON FUNCTION %s IS ''Parses a string into a numeric value'';', rec.sig);
  END LOOP;

  -- Clear column comments containing the broken string
  FOR rec IN
    SELECT c.relname AS table_name, a.attname AS column_name
    FROM pg_description d
    JOIN pg_class c ON c.oid = d.objoid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.objsubid
    WHERE n.nspname = 'public'
      AND d.description ILIKE '%val_str%'
  LOOP
    EXECUTE format('COMMENT ON COLUMN public.%I.%I IS NULL;', rec.table_name, rec.column_name);
  END LOOP;

  -- Clear table/view comments containing the broken string
  FOR rec IN
    SELECT c.relname AS table_name
    FROM pg_description d
    JOIN pg_class c ON c.oid = d.objoid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND d.objsubid = 0
      AND d.description ILIKE '%val_str%'
  LOOP
    EXECUTE format('COMMENT ON TABLE public.%I IS NULL;', rec.table_name);
  END LOOP;
END;
$$;
