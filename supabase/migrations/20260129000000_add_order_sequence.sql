-- Create sequence for Order Number if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS pedido_numero_seq;

-- Function to safely get next order number using sequence
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  SELECT nextval('pedido_numero_seq') INTO next_val;
  RETURN next_val;
END;
$$;

-- Block to sync the sequence with the current table state
DO $$
DECLARE
    max_val INTEGER;
BEGIN
    -- Get current max NÚMERO DO PEDIDO, default to 0 if null
    SELECT COALESCE(MAX("NÚMERO DO PEDIDO"), 0) INTO max_val FROM "public"."BANCO_DE_DADOS";
    
    -- Set the sequence to the current max value
    -- The next call to nextval will return max_val + 1
    PERFORM setval('pedido_numero_seq', max_val);
END $$;
