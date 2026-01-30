-- Migration to consolidate configuration tables and ensure email_relatorio key exists

-- 1. Ensure 'email_relatorio' exists in 'configuracoes' table
-- We check for potential existing values in other keys or tables to preserve data
DO $$
DECLARE
    current_val TEXT;
    legacy_val TEXT;
    system_val TEXT;
BEGIN
    -- Check if we already have a value for 'email_relatorio'
    SELECT valor INTO current_val FROM configuracoes WHERE chave = 'email_relatorio';

    -- If not, check for 'destinatario_email' (from a recent migration attempt)
    IF current_val IS NULL THEN
        SELECT valor INTO legacy_val FROM configuracoes WHERE chave = 'destinatario_email';
        
        -- If found, use it
        IF legacy_val IS NOT NULL THEN
            INSERT INTO configuracoes (chave, valor) VALUES ('email_relatorio', legacy_val);
            current_val := legacy_val;
        END IF;
    END IF;

    -- If still not found, check 'email_relatorio_rota'
    IF current_val IS NULL THEN
        SELECT valor INTO legacy_val FROM configuracoes WHERE chave = 'email_relatorio_rota';
        
        IF legacy_val IS NOT NULL THEN
            INSERT INTO configuracoes (chave, valor) VALUES ('email_relatorio', legacy_val);
            current_val := legacy_val;
        END IF;
    END IF;

    -- If still not found, try to rescue from 'configuracoes_sistema' if it exists
    IF current_val IS NULL THEN
        BEGIN
            EXECUTE 'SELECT valor FROM configuracoes_sistema WHERE chave = $1' 
            INTO system_val 
            USING 'email_relatorio';
            
            IF system_val IS NOT NULL THEN
                INSERT INTO configuracoes (chave, valor) VALUES ('email_relatorio', system_val);
                current_val := system_val;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Table might not exist, ignore
        END;
    END IF;

    -- Finally, if no value exists anywhere, set a default
    IF current_val IS NULL THEN
         INSERT INTO configuracoes (chave, valor) VALUES ('email_relatorio', 'admin@example.com');
    END IF;

END $$;

-- 2. Drop the redundant table 'configuracoes_sistema'
DROP TABLE IF EXISTS configuracoes_sistema;

-- 3. Cleanup old keys in 'configuracoes' if desired (optional but good for consolidation)
DELETE FROM configuracoes WHERE chave IN ('destinatario_email', 'email_relatorio_rota');
