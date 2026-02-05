CREATE OR REPLACE FUNCTION bulk_update_product_codes(payload json)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  record json;
BEGIN
  FOR record IN SELECT * FROM json_array_elements(payload)
  LOOP
    UPDATE "PRODUTOS"
    SET 
      "codigo_interno" = record->>'codigo_interno',
      "CÓDIGO BARRAS" = record->>'codigo_barras'
    WHERE "ID" = (record->>'id')::integer;
  END LOOP;
END;
$$;
