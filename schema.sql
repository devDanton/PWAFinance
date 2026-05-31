-- ==========================================
-- PWA Finance - Supabase Schema & RLS
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up previous execution to avoid "already exists" errors during setup
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS credit_cards CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_workspace() CASCADE;

-- ==========================================
-- 1. Profiles Table
-- ==========================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  language_preference TEXT DEFAULT 'pt' CHECK (language_preference IN ('en', 'pt')),
  transaction_sort_preference TEXT DEFAULT 'date:desc',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile."
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to handle new user creation from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name)
  VALUES (new.id, new.raw_user_meta_data->>'first_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile for new auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 2. Workspaces Table
-- ==========================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 3. Workspace Members Table
-- ==========================================
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- Policies for Workspaces (Created after members to avoid errors)
-- ==========================================
-- Function to get workspaces a user is a member of (bypasses RLS to avoid infinite recursion)
CREATE OR REPLACE FUNCTION public.get_user_workspaces()
RETURNS SETOF uuid AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Users can view workspaces they belong to"
  ON workspaces FOR SELECT
  USING (
    auth.uid() = owner_id OR 
    id IN (SELECT public.get_user_workspaces())
  );

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can update workspaces"
  ON workspaces FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can delete workspaces"
  ON workspaces FOR DELETE
  USING (auth.uid() = owner_id);


-- ==========================================
-- Policies for Workspace Members
-- ==========================================
CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members FOR SELECT
  USING (
    auth.uid() = user_id OR 
    workspace_id IN (SELECT public.get_user_workspaces())
  );

CREATE POLICY "Workspace admins can manage members"
  ON workspace_members FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to automatically add owner as admin member
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new.id, new.owner_id, 'admin');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create admin member when workspace is created
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_workspace();


-- ==========================================
-- 4. Credit Cards Table
-- ==========================================
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  total_limit DECIMAL(12, 2) NOT NULL,
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  color TEXT DEFAULT '#000000',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view credit cards of their workspaces"
  ON credit_cards FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    workspace_id IN (SELECT public.get_user_workspaces())
  );

CREATE POLICY "Members can manage credit cards in their workspaces"
  ON credit_cards FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    workspace_id IN (SELECT public.get_user_workspaces())
  );


-- ==========================================
-- 5. Transactions Table
-- ==========================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL,
  due_date DATE,
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  installments INTEGER DEFAULT 1 CHECK (installments >= 1),
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view transactions of their workspaces"
  ON transactions FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    workspace_id IN (SELECT public.get_user_workspaces())
  );

CREATE POLICY "Members can manage transactions in their workspaces"
  ON transactions FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR
    workspace_id IN (SELECT public.get_user_workspaces())
  );

-- ==========================================
-- 6. Categories Table
-- ==========================================
CREATE TABLE categories (
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

-- ==========================================
-- 7. Subscriptions Table
-- ==========================================
CREATE TABLE subscriptions (
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

-- ==========================================
-- 8. PG_CRON for Subscriptions
-- ==========================================
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

-- Uncomment below to schedule in your database (needs pg_cron enabled in the active database)
-- SELECT cron.schedule('process-subscriptions-daily', '0 0 * * *', 'SELECT process_subscriptions()');
