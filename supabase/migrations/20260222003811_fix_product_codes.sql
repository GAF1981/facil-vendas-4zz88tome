ALTER TABLE public."BANCO_DE_DADOS" 
ADD COLUMN IF NOT EXISTS "codigo_interno" text,
ADD COLUMN IF NOT EXISTS "codigo_barras" text;

UPDATE public."PRODUTOS"
SET "codigo_interno" = '9000013', "CÓDIGO BARRAS" = '9788532241054'
WHERE "PRODUTO" ILIKE '%brinquedo 19,99%';

UPDATE public."BANCO_DE_DADOS"
SET 
  "codigo_interno" = '9000013', 
  "codigo_barras" = '9788532241054',
  "COD. PRODUTO" = (SELECT "ID" FROM public."PRODUTOS" WHERE "PRODUTO" ILIKE '%brinquedo 19,99%' LIMIT 1)
WHERE "MERCADORIA" ILIKE '%brinquedo 19,99%';

