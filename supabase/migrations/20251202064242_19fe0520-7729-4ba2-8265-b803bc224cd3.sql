-- Create gifts table for persisting user-specific gift suggestions
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_min INTEGER NOT NULL,
  price_max INTEGER NOT NULL,
  match_score DECIMAL(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  matched_tags TEXT[] NOT NULL DEFAULT '{}',
  ai_rationale TEXT NOT NULL,
  delivery_estimate TEXT NOT NULL,
  vendor TEXT NOT NULL,
  images JSONB NOT NULL,
  buy_link TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- Users can only insert gifts with their own user_id
CREATE POLICY "Users can insert their own gifts"
ON public.gifts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only view their own gifts
CREATE POLICY "Users can view their own gifts"
ON public.gifts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own gifts
CREATE POLICY "Users can update their own gifts"
ON public.gifts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own gifts
CREATE POLICY "Users can delete their own gifts"
ON public.gifts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_gifts_user_id ON public.gifts(user_id);
CREATE INDEX idx_gifts_created_at ON public.gifts(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_gifts_updated_at
BEFORE UPDATE ON public.gifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();