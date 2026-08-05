-- Add batch column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS batch text;

-- Performance index for batch filtering
CREATE INDEX IF NOT EXISTS idx_profiles_batch ON public.profiles(batch);
