-- Migration to set up 'email_seguro' configuration key
-- Copies value from 'destinatario_email' if available and 'email_seguro' is missing

INSERT INTO public.configuracoes (chave, valor)
SELECT 'email_seguro', valor
FROM public.configuracoes
WHERE chave = 'destinatario_email'
AND NOT EXISTS (
    SELECT 1 FROM public.configuracoes WHERE chave = 'email_seguro'
);
