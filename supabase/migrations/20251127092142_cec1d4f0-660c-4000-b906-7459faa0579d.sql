-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create search_history table to store user searches
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  relation TEXT NOT NULL,
  occasion TEXT NOT NULL,
  budget_min INTEGER NOT NULL,
  budget_max INTEGER NOT NULL,
  hobbies TEXT[] NOT NULL,
  personalities TEXT[] NOT NULL,
  city TEXT,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we don't have auth yet)
CREATE POLICY "Allow public read access to search_history" 
ON public.search_history 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to search_history" 
ON public.search_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to search_history" 
ON public.search_history 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete to search_history" 
ON public.search_history 
FOR DELETE 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_search_history_created_at ON public.search_history(created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_search_history_updated_at
BEFORE UPDATE ON public.search_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();