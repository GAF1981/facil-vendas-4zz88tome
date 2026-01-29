ALTER TABLE "BANCO_DE_DADOS" ALTER COLUMN solicitacao_nf SET DEFAULT 'NÃO';

UPDATE "BANCO_DE_DADOS" 
SET solicitacao_nf = 'NÃO' 
WHERE solicitacao_nf IS NULL OR solicitacao_nf = '';
