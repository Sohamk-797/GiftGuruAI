-- Migration: Fix SECURITY DEFINER view issue on user_favourite_gifts
-- 2025-12-30: Recreate user_favourite_gifts view WITHOUT SECURITY DEFINER
-- The view should use RLS of the querying user, not the view creator

-- Drop the insecure view
DROP VIEW IF EXISTS public.user_favourite_gifts CASCADE;

-- Recreate the view WITHOUT SECURITY DEFINER
-- This ensures RLS is applied from the perspective of the querying user
CREATE VIEW public.user_favourite_gifts AS
SELECT
  f.id,
  f.user_id,
  f.gift_id,
  f.created_at,
  g.id as gift_id,
  g.user_id as gift_user_id,
  g.title,
  g.description,
  g.price_min,
  g.price_max,
  g.match_score,
  g.matched_tags,
  g.ai_rationale,
  g.delivery_estimate,
  g.vendor,
  g.images,
  g.buy_link,
  g.is_public,
  g.created_at as gift_created_at,
  g.updated_at as gift_updated_at
FROM
  public.favorites f
  INNER JOIN public.gifts g ON f.gift_id = g.id
WHERE
  f.user_id = auth.uid();

-- Add comment for clarity
COMMENT ON VIEW public.user_favourite_gifts IS 'User favorites with full gift details. Uses RLS from the querying user''s perspective (not SECURITY DEFINER).';
