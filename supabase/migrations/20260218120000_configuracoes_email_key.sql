-- Migration to update the configuration key for email recipient to 'destinatario_email'
-- ensuring consistency with the User Story while preserving existing configuration.

DO $$
DECLARE
    old_val TEXT;
BEGIN
    -- Check for existing value in the old key
    SELECT valor INTO old_val FROM configuracoes WHERE chave = 'email_relatorio_rota';
    
    IF old_val IS NOT NULL THEN
        -- If old key exists, insert new key with same value
        INSERT INTO configuracoes (chave, valor)
        VALUES ('destinatario_email', old_val)
        ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;
    ELSE
        -- If old key doesn't exist, insert new key with default value
        INSERT INTO configuracoes (chave, valor)
        VALUES ('destinatario_email', 'admin@example.com')
        ON CONFLICT (chave) DO NOTHING;
    END IF;
END $$;
