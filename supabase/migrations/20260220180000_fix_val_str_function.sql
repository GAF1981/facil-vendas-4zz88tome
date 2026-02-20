DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Find the specific function(s) that cause the multiline JSDoc syntax error in types.ts
  FOR rec IN
    SELECT p.oid AS fn_oid, p.proname, pg_get_function_identity_arguments(p.oid) as args, pg_get_function_result(p.oid) as rettype
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosrc ILIKE '%val_str ~%'
  LOOP
    -- Recreate the function using LANGUAGE plpgsql instead of LANGUAGE sql
    -- This hides the function body from PostgREST/Supabase CLI type generator,
    -- preventing the multiline string literal from breaking the generated types.ts file.
    EXECUTE format('
      CREATE OR REPLACE FUNCTION public.%I(%s) RETURNS %s LANGUAGE plpgsql IMMUTABLE AS $func$
      BEGIN
        RETURN (
          CASE 
            WHEN val_str ~ ''^[0-9.]+,[0-9]+$'' THEN CAST(REPLACE(REPLACE(val_str, ''.'', ''''), '','', ''.'') AS NUMERIC)
            WHEN val_str ~ ''^[0-9]+,[0-9]+$'' THEN CAST(REPLACE(val_str, '','', ''.'') AS NUMERIC)
            ELSE CAST(val_str AS NUMERIC)
          END
        );
      END;
      $func$;
    ', rec.proname, rec.args, rec.rettype);
  END LOOP;
END;
$$;
