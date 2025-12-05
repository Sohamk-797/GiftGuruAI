-- supabase/migrations/20251205_create_favorites_table.sql

-- 1) Create table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, gift_id)
);

-- 2) Enable Row Level Security
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- 3) RLS policies
CREATE POLICY "Users can select their own favorites"
  ON public.favorites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON public.favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.favorites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- (Optional) you can allow updates if you plan to change rows, but insert + delete suffice for toggle
-- 4) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_gift_id ON public.favorites(gift_id);
