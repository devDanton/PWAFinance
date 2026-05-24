-- ==========================================
-- SCRIPT DE CORREÇÃO: Prevenir Infinite Recursion
-- Rode este script no SQL Editor do Supabase
-- ==========================================

-- 1. Criar a função que burla o RLS de forma segura (Security Definer)
CREATE OR REPLACE FUNCTION public.get_user_workspaces()
RETURNS SETOF uuid AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Recriar a política de Workspaces
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
CREATE POLICY "Users can view workspaces they belong to"
  ON workspaces FOR SELECT
  USING (
    auth.uid() = owner_id OR 
    id IN (SELECT public.get_user_workspaces())
  );

-- 3. Recriar a política de Workspace Members
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members FOR SELECT
  USING (
    auth.uid() = user_id OR 
    workspace_id IN (SELECT public.get_user_workspaces())
  );

-- 4. Recriar a política de Credit Cards (View)
DROP POLICY IF EXISTS "Members can view credit cards of their workspaces" ON credit_cards;
CREATE POLICY "Members can view credit cards of their workspaces"
  ON credit_cards FOR SELECT
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR
    workspace_id IN (SELECT public.get_user_workspaces())
  );

-- 5. Recriar a política de Credit Cards (Manage)
DROP POLICY IF EXISTS "Members can manage credit cards in their workspaces" ON credit_cards;
CREATE POLICY "Members can manage credit cards in their workspaces"
  ON credit_cards FOR ALL
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR
    workspace_id IN (SELECT public.get_user_workspaces())
  );

-- 6. Recriar a política de Transactions (View)
DROP POLICY IF EXISTS "Members can view transactions of their workspaces" ON transactions;
CREATE POLICY "Members can view transactions of their workspaces"
  ON transactions FOR SELECT
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR
    workspace_id IN (SELECT public.get_user_workspaces())
  );

-- 7. Recriar a política de Transactions (Manage)
DROP POLICY IF EXISTS "Members can manage transactions in their workspaces" ON transactions;
CREATE POLICY "Members can manage transactions in their workspaces"
  ON transactions FOR ALL
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR
    workspace_id IN (SELECT public.get_user_workspaces())
  );
