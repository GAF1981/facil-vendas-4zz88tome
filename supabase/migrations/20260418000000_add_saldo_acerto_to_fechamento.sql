ALTER TABLE public.fechamento_caixa ADD COLUMN IF NOT EXISTS saldo_acerto numeric DEFAULT 0;
ALTER TABLE public.fechamento_caixa ADD COLUMN IF NOT EXISTS saldo_acerto_aprovado boolean DEFAULT false;
