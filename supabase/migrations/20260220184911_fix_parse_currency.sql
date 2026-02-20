CREATE OR REPLACE FUNCTION public.parse_currency_sql(val_str text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN val_str IS NULL OR trim(val_str) = '' THEN 0
    WHEN regexp_replace(val_str, '[^0-9.,-]', '', 'g') = '' THEN 0
    WHEN position(',' in val_str) > 0 AND position('.' in val_str) > 0 THEN CAST(replace(replace(regexp_replace(val_str, '[^0-9.,-]', '', 'g'), '.', ''), ',', '.') AS NUMERIC)
    WHEN position(',' in val_str) > 0 THEN CAST(replace(regexp_replace(val_str, '[^0-9.,-]', '', 'g'), ',', '.') AS NUMERIC)
    ELSE CAST(regexp_replace(val_str, '[^0-9.,-]', '', 'g') AS NUMERIC)
  END;
$$;
