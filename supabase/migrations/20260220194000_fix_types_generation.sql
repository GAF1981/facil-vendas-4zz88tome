-- Overwrite the VARCHAR overload to ensure it uses plpgsql and its body isn't exposed improperly in types
CREATE OR REPLACE FUNCTION public.parse_currency_sql(val_str VARCHAR)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    cleaned TEXT;
BEGIN
    IF val_str IS NULL OR TRIM(val_str) = '' THEN
        RETURN 0;
    END IF;

    cleaned := REGEXP_REPLACE(val_str, '[^0-9.,-]', '', 'g');
    
    IF cleaned = '' OR cleaned = '-' THEN
        RETURN 0;
    END IF;

    IF POSITION(',' IN cleaned) > 0 THEN
        cleaned := REPLACE(cleaned, '.', '');
        cleaned := REPLACE(cleaned, ',', '.');
    END IF;

    RETURN CAST(cleaned AS NUMERIC);
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$$;

-- Ensure TEXT overload is also plpgsql and clean
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

    cleaned := REGEXP_REPLACE(val_str, '[^0-9.,-]', '', 'g');
    
    IF cleaned = '' OR cleaned = '-' THEN
        RETURN 0;
    END IF;

    IF POSITION(',' IN cleaned) > 0 THEN
        cleaned := REPLACE(cleaned, '.', '');
        cleaned := REPLACE(cleaned, ',', '.');
    END IF;

    RETURN CAST(cleaned AS NUMERIC);
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$$;

-- Clear any comments on the functions that might be causing typegen issues
COMMENT ON FUNCTION public.parse_currency_sql(VARCHAR) IS NULL;
COMMENT ON FUNCTION public.parse_currency_sql(TEXT) IS NULL;
