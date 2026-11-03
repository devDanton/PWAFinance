-- ==============================================================================
-- Migração: Idempotência com Suporte a Transações Múltiplas Legítimas (occurrence_index)
-- ==============================================================================
-- 1. Cria tabela de backup de segurança com RLS habilitado (caso ainda não exista)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS transactions_backup_before_unique AS 
SELECT * FROM public.transactions;

ALTER TABLE transactions_backup_before_unique ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. Adiciona a coluna occurrence_index na tabela transactions
-- ==============================================================================
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS occurrence_index INTEGER DEFAULT 1 NOT NULL;

-- Atualiza registros existentes calculando a ordem de ocorrência (1, 2, 3...)
-- para transações com mesmo cartão, vencimento, data, descrição e valor.
WITH ranked_transactions AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY workspace_id, credit_card_id, due_date, date, description, amount
           ORDER BY created_at ASC, id ASC
         ) as computed_index
  FROM public.transactions
)
UPDATE public.transactions t
SET occurrence_index = r.computed_index
FROM ranked_transactions r
WHERE t.id = r.id;

-- ==============================================================================
-- 3. Cria a constraint de unicidade incluindo occurrence_index
-- Permite N transações idênticas legítimas (ex: estornos múltiplos, passagens)
-- e bloqueia duplicação caso o mesmo lote/CSV seja reenviado.
-- ==============================================================================
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS unique_transaction_per_card_due;

ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS unique_transaction_with_occurrence;

ALTER TABLE public.transactions 
ADD CONSTRAINT unique_transaction_with_occurrence 
UNIQUE NULLS NOT DISTINCT (workspace_id, credit_card_id, due_date, date, description, amount, occurrence_index);

-- 4. Repete para tabela 'expenses' se existir no ambiente
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS occurrence_index INTEGER DEFAULT 1 NOT NULL;
    
    WITH ranked_expenses AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY workspace_id, credit_card_id, due_date, date, description, amount
               ORDER BY created_at ASC, id ASC
             ) as computed_index
      FROM public.expenses
    )
    UPDATE public.expenses e
    SET occurrence_index = r.computed_index
    FROM ranked_expenses r
    WHERE e.id = r.id;

    ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS unique_expense_per_card_due;
    ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS unique_expense_with_occurrence;
    ALTER TABLE public.expenses 
    ADD CONSTRAINT unique_expense_with_occurrence 
    UNIQUE NULLS NOT DISTINCT (workspace_id, credit_card_id, due_date, date, description, amount, occurrence_index);
  END IF;
END $$;
