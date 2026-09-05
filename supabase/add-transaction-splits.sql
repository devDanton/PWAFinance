-- Migration: Add transaction_splits table for splitting expenses among multiple payers
CREATE TABLE IF NOT EXISTS transaction_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  payer_id UUID REFERENCES payers(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    CREATE POLICY "Members can view splits of their workspaces"
      ON transaction_splits FOR SELECT
      USING (
        transaction_id IN (
          SELECT id FROM transactions WHERE workspace_id IN (
            SELECT public.get_user_workspaces()
          ) OR workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
          )
        )
      );
  EXCEPTION WHEN duplicate_object THEN null;
  END;

  BEGIN
    CREATE POLICY "Members can manage splits in their workspaces"
      ON transaction_splits FOR ALL
      USING (
        transaction_id IN (
          SELECT id FROM transactions WHERE workspace_id IN (
            SELECT public.get_user_workspaces()
          ) OR workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
          )
        )
      );
  EXCEPTION WHEN duplicate_object THEN null;
  END;
END $$;
