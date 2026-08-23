-- Add Payers (Third-party) management

CREATE TABLE IF NOT EXISTS payers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE payers ENABLE ROW LEVEL SECURITY;

-- Note: The policy names must be unique per table. We'll use DROP IF EXISTS implicitly by just recreating or ignoring
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Members can view payers of their workspaces"
      ON payers FOR SELECT
      USING (
        workspace_id IN (
          SELECT id FROM workspaces WHERE owner_id = auth.uid()
        ) OR
        workspace_id IN (SELECT public.get_user_workspaces())
      );
  EXCEPTION WHEN duplicate_object THEN null;
  END;

  BEGIN
    CREATE POLICY "Members can manage payers in their workspaces"
      ON payers FOR ALL
      USING (
        workspace_id IN (
          SELECT id FROM workspaces WHERE owner_id = auth.uid()
        ) OR
        workspace_id IN (SELECT public.get_user_workspaces())
      );
  EXCEPTION WHEN duplicate_object THEN null;
  END;
END $$;

-- Add payer_id to transactions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='transactions' AND column_name='payer_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN payer_id UUID REFERENCES payers(id) ON DELETE SET NULL;
  END IF;
END $$;
