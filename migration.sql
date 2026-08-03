-- Run this in your Supabase SQL Editor:
ALTER TABLE public.roadmaps ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE;
