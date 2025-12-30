-- Migration: Optimize RLS policies and remove duplicate indexes
-- 2025-12-30: Fix performance issues flagged by Supabase linter

-- ============================================================================
-- ISSUE 1: Optimize auth.uid() calls in RLS policies
-- Wrap auth.uid() in (SELECT ...) to prevent re-evaluation for each row
-- ============================================================================

-- DROP all existing policies first
DROP POLICY IF EXISTS "Service role can manage gift_image_cache" ON public.gift_image_cache;
DROP POLICY IF EXISTS "Users can insert their own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Users can view their own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Users can update their own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Users can delete their own gifts" ON public.gifts;
DROP POLICY IF EXISTS "gifts_owner_select" ON public.gifts;
DROP POLICY IF EXISTS "users_can_manage_their_favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can select their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "favorites_owner_select" ON public.favorites;
DROP POLICY IF EXISTS "favorites_owner_insert" ON public.favorites;
DROP POLICY IF EXISTS "favorites_owner_delete" ON public.favorites;
DROP POLICY IF EXISTS "Users can select their own search_history" ON public.search_history;
DROP POLICY IF EXISTS "Users can insert their own search_history" ON public.search_history;
DROP POLICY IF EXISTS "Users can update their own search_history" ON public.search_history;
DROP POLICY IF EXISTS "Users can delete their own search_history" ON public.search_history;
DROP POLICY IF EXISTS "search_history_owner_select" ON public.search_history;
DROP POLICY IF EXISTS "search_history_owner_insert" ON public.search_history;

-- ============================================================================
-- RECREATE: gift_image_cache policies (optimized)
-- ============================================================================

-- Public read access (images are public)
CREATE POLICY "Public read access to gift_image_cache"
  ON public.gift_image_cache
  FOR SELECT
  USING (true);

-- Service role can manage (backend only)
CREATE POLICY "Service role can manage gift_image_cache"
  ON public.gift_image_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- RECREATE: gifts table policies (optimized, consolidated)
-- ============================================================================

-- Users can insert gifts with their own user_id
CREATE POLICY "Users can insert their own gifts"
  ON public.gifts
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can view their own gifts
CREATE POLICY "Users can view their own gifts"
  ON public.gifts
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Users can update their own gifts
CREATE POLICY "Users can update their own gifts"
  ON public.gifts
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Users can delete their own gifts
CREATE POLICY "Users can delete their own gifts"
  ON public.gifts
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- RECREATE: favorites table policies (optimized, consolidated)
-- ============================================================================

-- Users can select their own favorites
CREATE POLICY "Users can select their own favorites"
  ON public.favorites
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites"
  ON public.favorites
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
  ON public.favorites
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- RECREATE: search_history table policies (optimized, consolidated)
-- ============================================================================

-- Users can select their own search_history
CREATE POLICY "Users can select their own search_history"
  ON public.search_history
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Users can insert their own search_history
CREATE POLICY "Users can insert their own search_history"
  ON public.search_history
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can update their own search_history
CREATE POLICY "Users can update their own search_history"
  ON public.search_history
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can delete their own search_history
CREATE POLICY "Users can delete their own search_history"
  ON public.search_history
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- ISSUE 2: Remove duplicate indexes on favorites table
-- ============================================================================

-- Drop duplicate indexes (keeping the more descriptive names)
DROP INDEX IF EXISTS public.idx_favorites_gift;
DROP INDEX IF EXISTS public.idx_favorites_user;

-- Keep these indexes (they're identical to the ones above):
-- idx_favorites_gift_id (already exists)
-- idx_favorites_user_id (already exists)

-- ============================================================================
-- Add comments for clarity
-- ============================================================================

COMMENT ON POLICY "Users can insert their own gifts" ON public.gifts IS 
  'Optimized: Uses (SELECT auth.uid()) to prevent per-row re-evaluation';

COMMENT ON POLICY "Users can select their own favorites" ON public.favorites IS 
  'Optimized: Uses (SELECT auth.uid()) to prevent per-row re-evaluation';

COMMENT ON POLICY "Users can select their own search_history" ON public.search_history IS 
  'Optimized: Uses (SELECT auth.uid()) to prevent per-row re-evaluation';
