-- Criação de Índices Estratégicos para PWAFinance
-- Rode isso no SQL Editor do Supabase para acelerar suas consultas (evitar Full Table Scans)

-- 1. Índices para a tabela 'transactions'
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_id ON transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card_id ON transactions(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- 2. Índices para a tabela 'subscriptions'
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_category_id ON subscriptions(category_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_credit_card_id ON subscriptions(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_date ON subscriptions(next_date ASC);

-- 3. Índices para a tabela 'categories'
CREATE INDEX IF NOT EXISTS idx_categories_workspace_id ON categories(workspace_id);

-- 4. Índices para a tabela 'credit_cards'
CREATE INDEX IF NOT EXISTS idx_credit_cards_workspace_id ON credit_cards(workspace_id);
