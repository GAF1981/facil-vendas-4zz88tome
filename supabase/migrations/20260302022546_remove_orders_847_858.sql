-- Delete Order 847 (Casa do Milho - double entry error) and Order 858 (Test Client)
DO $$
BEGIN
  -- Completely remove Order 847 to allow the user to re-enter it correctly
  PERFORM public.delete_full_order(847);

  -- Completely remove Order 858 (Test Order)
  PERFORM public.delete_full_order(858);
END $$;
