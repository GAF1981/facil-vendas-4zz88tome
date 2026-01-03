-- Override the get_next_order_number function to strictly follow MAX + 1 logic
-- This fixes issues where sequence-based logic might become desynchronized
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  max_val INTEGER;
BEGIN
  -- Find the current maximum order number, ignoring potential nulls
  SELECT MAX("NÚMERO DO PEDIDO") INTO max_val FROM "public"."BANCO_DE_DADOS";
  
  -- Return Max + 1, or 1 if the table is empty (COALESCE handles null if table empty)
  RETURN COALESCE(max_val, 0) + 1;
END;
$$;
