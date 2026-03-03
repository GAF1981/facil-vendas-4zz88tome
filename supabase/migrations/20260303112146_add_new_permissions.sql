-- Add 'Boletos' permission module to all existing sectors defaulting to false
INSERT INTO public.permissoes (setor, modulo, acesso)
SELECT DISTINCT setor, 'Boletos', false
FROM public.permissoes
ON CONFLICT (setor, modulo) DO NOTHING;

-- Add 'E-mail Seguro' permission module to all existing sectors defaulting to false
INSERT INTO public.permissoes (setor, modulo, acesso)
SELECT DISTINCT setor, 'E-mail Seguro', false
FROM public.permissoes
ON CONFLICT (setor, modulo) DO NOTHING;

-- Ensure Administrador has access to these new modules by default
UPDATE public.permissoes
SET acesso = true
WHERE setor = 'Administrador' AND modulo IN ('Boletos', 'E-mail Seguro');
