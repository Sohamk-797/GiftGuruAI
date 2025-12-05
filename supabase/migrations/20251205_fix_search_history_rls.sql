-- 2025-12-05: Fix search_history RLS to scope rows to authenticated user
-- Drops permissive public policies and creates user-scoped policies.

-- 1) Drop any existing permissive policies (safe to run even if not present)
DROP POLICY IF EXISTS "Allow public read access to search_history" ON public.search_history;
DROP POLICY IF EXISTS "Allow public insert to search_history" ON public.search_history;
DROP POLICY IF EXISTS "Allow public update to search_history" ON public.search_history;
DROP POLICY IF EXISTS "Allow public delete to search_history" ON public.search_history;

-- 2) Ensure RLS is enabled (harmless if already enabled)
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- 3) Create policies restricting access to the owner (user_id)
-- SELECT: users can only select rows where auth.uid() = user_id
CREATE POLICY "Users can select their own search_history"
  ON public.search_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: users can only insert rows where auth.uid() = user_id
CREATE POLICY "Users can insert their own search_history"
  ON public.search_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can only update rows they own
CREATE POLICY "Users can update their own search_history"
  ON public.search_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only delete rows they own
CREATE POLICY "Users can delete their own search_history"
  ON public.search_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
