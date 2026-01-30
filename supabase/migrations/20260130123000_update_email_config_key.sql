-- Migration to update the configuration key from 'email_seguro' to 'email_relatorio'
-- This ensures consistency with the User Story requirements

DO $$
BEGIN
    -- Check if the old key exists and update it to the new key
    IF EXISTS (SELECT 1 FROM public.configuracoes WHERE chave = 'email_seguro') THEN
        UPDATE public.configuracoes 
        SET chave = 'email_relatorio' 
        WHERE chave = 'email_seguro';
    END IF;
END $$;
