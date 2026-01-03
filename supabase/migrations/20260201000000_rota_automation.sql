CREATE OR REPLACE FUNCTION increment_rota_items_on_finalize(p_rota_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "ROTA_ITEMS"
  SET x_na_rota = x_na_rota + 1
  WHERE rota_id = p_rota_id AND x_na_rota > 0;
END;
$$;
