-- This migration drops the function get_client_projections to allow
-- migration 20260307120000_fix_projections_logic_final.sql to run successfully.
-- The subsequent migration changes the return type of the function, which requires
-- dropping it first.

DROP FUNCTION IF EXISTS get_client_projections();
