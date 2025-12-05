-- Create table for caching gift images
CREATE TABLE IF NOT EXISTS public.gift_image_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_key text NOT NULL UNIQUE,
  image_urls jsonb NOT NULL,
  attribution jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gift_image_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (images are public)
CREATE POLICY "Public read access to gift_image_cache"
  ON public.gift_image_cache
  FOR SELECT
  USING (true);

-- Create policy for service role to insert/update (backend only)
CREATE POLICY "Service role can manage gift_image_cache"
  ON public.gift_image_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create index for fast lookups
CREATE INDEX idx_gift_image_cache_search_key ON public.gift_image_cache(search_key);

-- Create trigger for updated_at
CREATE TRIGGER update_gift_image_cache_updated_at
  BEFORE UPDATE ON public.gift_image_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();