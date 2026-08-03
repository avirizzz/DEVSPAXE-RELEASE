-- Migration to add notebook_id to roadmaps
ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE;
