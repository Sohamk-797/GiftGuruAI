-- Add age and name columns to search_history table
ALTER TABLE public.search_history 
ADD COLUMN age integer,
ADD COLUMN name text;