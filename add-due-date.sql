-- Execute no SQL Editor do Supabase para adicionar a coluna
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Opcional: Atualizar transações antigas para terem o due_date igual à data de compra
UPDATE public.transactions
SET due_date = date
WHERE due_date IS NULL;
