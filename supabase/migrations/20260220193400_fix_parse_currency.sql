-- Recreate parse_currency_sql to fix TypeScript generation syntax errors
DROP FUNCTION IF EXISTS public.parse_currency_sql(TEXT);

CREATE OR REPLACE FUNCTION public.parse_currency_sql(val_str TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    cleaned TEXT;
BEGIN
    IF val_str IS NULL OR TRIM(val_str) = '' THEN
        RETURN 0;
    END IF;

    -- Remove currency symbols, spaces, and other non-numeric characters except dot, comma, and minus
    cleaned := REGEXP_REPLACE(val_str, '[^0-9.,-]', '', 'g');
    
    IF cleaned = '' OR cleaned = '-' THEN
        RETURN 0;
    END IF;

    -- If there is a comma, it acts as the decimal separator (Brazilian format)
    -- So we remove all dots (thousands separators) and change the comma to a dot
    IF POSITION(',' IN cleaned) > 0 THEN
        cleaned := REPLACE(cleaned, '.', '');
        cleaned := REPLACE(cleaned, ',', '.');
    END IF;

    RETURN CAST(cleaned AS NUMERIC);
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$$;

COMMENT ON FUNCTION public.parse_currency_sql(TEXT) IS 'Parses currency strings into numeric values safely.';
