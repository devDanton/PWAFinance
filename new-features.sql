-- 1. Add sort preference to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS transaction_sort_preference TEXT DEFAULT 'date:desc';

-- 2. Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#808080',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view categories of their workspaces"
  ON categories FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    workspace_id IN (SELECT public.get_user_workspaces())
  );

CREATE POLICY "Members can manage categories in their workspaces"
  ON categories FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    workspace_id IN (SELECT public.get_user_workspaces())
  );

-- 3. Update transactions table to use categories
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Migrate existing text categories to the new table
DO $$
DECLARE
  tx RECORD;
  cat_id UUID;
BEGIN
  FOR tx IN SELECT DISTINCT category, workspace_id FROM transactions WHERE category IS NOT NULL AND category != ''
  LOOP
    -- Insert category if not exists for this workspace
    SELECT id INTO cat_id FROM categories WHERE name = tx.category AND workspace_id = tx.workspace_id LIMIT 1;
    
    IF cat_id IS NULL THEN
      INSERT INTO categories (workspace_id, name) VALUES (tx.workspace_id, tx.category) RETURNING id INTO cat_id;
    END IF;
    
    -- Update transactions
    UPDATE transactions SET category_id = cat_id WHERE category = tx.category AND workspace_id = tx.workspace_id;
  END LOOP;
END;
$$;

-- Make category_id required and drop old column (optional, but good practice. Assuming we drop it)
-- ALTER TABLE transactions ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE transactions DROP COLUMN IF EXISTS category;

-- 4. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
  next_date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscriptions of their workspaces"
  ON subscriptions FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    workspace_id IN (SELECT public.get_user_workspaces())
  );

CREATE POLICY "Members can manage subscriptions in their workspaces"
  ON subscriptions FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    workspace_id IN (SELECT public.get_user_workspaces())
  );

-- 5. PG_CRON for Subscriptions
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION process_subscriptions()
RETURNS void AS $$
DECLARE
  sub RECORD;
BEGIN
  FOR sub IN 
    SELECT * FROM subscriptions WHERE active = true AND next_date <= CURRENT_DATE
  LOOP
    -- Insert transaction
    INSERT INTO transactions (
      workspace_id, created_by, type, amount, date, due_date, description, category_id, credit_card_id, is_paid
    ) VALUES (
      sub.workspace_id, sub.created_by, sub.type, sub.amount, sub.next_date, sub.next_date, sub.description, sub.category_id, sub.credit_card_id, false
    );

    -- Update next_date
    IF sub.frequency = 'monthly' THEN
      UPDATE subscriptions SET next_date = sub.next_date + INTERVAL '1 month' WHERE id = sub.id;
    ELSIF sub.frequency = 'yearly' THEN
      UPDATE subscriptions SET next_date = sub.next_date + INTERVAL '1 year' WHERE id = sub.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule the job to run every day at midnight
-- Note: the cron job requires the database to have the pg_cron extension fully enabled on the active schema.
-- SELECT cron.unschedule('process-subscriptions-daily'); -- Removemos para evitar erro na 1ª vez
SELECT cron.schedule('process-subscriptions-daily', '0 0 * * *', 'SELECT process_subscriptions()');
