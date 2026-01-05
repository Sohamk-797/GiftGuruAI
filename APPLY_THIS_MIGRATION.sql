-- ============================================================================
-- COPY THIS ENTIRE FILE AND RUN IN SUPABASE SQL EDITOR
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================================

-- Migration: Add username/password authentication system with auto-signup
-- 2025-12-30: Implement custom auth alongside Supabase OAuth

-- Create custom users table for username/password auth
-- This works alongside Supabase Auth for OAuth users
CREATE TABLE IF NOT EXISTS public.custom_auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  -- Link to Supabase auth.users for unified user tracking
  supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Metadata
  login_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_auth_username ON public.custom_auth_users(username);
CREATE INDEX IF NOT EXISTS idx_custom_auth_supabase_user ON public.custom_auth_users(supabase_user_id);

-- Enable RLS
ALTER TABLE public.custom_auth_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own custom_auth record" ON public.custom_auth_users;
DROP POLICY IF EXISTS "Service role can manage custom_auth users" ON public.custom_auth_users;

-- Users can only read their own record
CREATE POLICY "Users can view own custom_auth record"
  ON public.custom_auth_users FOR SELECT
  TO authenticated
  USING (supabase_user_id = auth.uid());

-- Service role can manage all records (for auto-signup edge function)
CREATE POLICY "Service role can manage custom_auth users"
  ON public.custom_auth_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Extend search_history to always require user_id
-- This migration makes user_id mandatory for all future searches
DO $$ 
BEGIN
  -- Only alter if column exists and is nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_history' 
    AND column_name = 'user_id' 
    AND is_nullable = 'YES'
  ) THEN
    -- First, delete any orphaned rows without user_id
    DELETE FROM public.search_history WHERE user_id IS NULL;
    
    -- Now make it NOT NULL
    ALTER TABLE public.search_history 
      ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Add index on user_id for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_search_history_user_id 
  ON public.search_history(user_id);

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.unified_users;

-- Create a view that unifies OAuth and custom auth users
CREATE VIEW public.unified_users AS
SELECT 
  au.id as user_id,
  au.email as identifier,
  'oauth' as auth_type,
  au.created_at,
  au.last_sign_in_at as last_login_at
FROM auth.users au
WHERE au.id NOT IN (SELECT supabase_user_id FROM public.custom_auth_users WHERE supabase_user_id IS NOT NULL)

UNION ALL

SELECT 
  cau.supabase_user_id as user_id,
  cau.username as identifier,
  'custom' as auth_type,
  cau.created_at,
  cau.last_login_at
FROM public.custom_auth_users cau
WHERE cau.supabase_user_id IS NOT NULL;

-- Comment explaining the design
COMMENT ON TABLE public.custom_auth_users IS 'Custom username/password authentication with auto-signup. Works alongside Supabase OAuth. Every custom auth user gets a linked Supabase user record for unified tracking.';

-- ============================================================================
-- MIGRATION COMPLETE
-- Next: Set edge function secrets in Dashboard → Functions → custom-auth
-- ============================================================================
