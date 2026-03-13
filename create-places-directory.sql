-- Create the master places directory table
-- Run this in Supabase SQL editor FIRST, then run seed-places-directory.js

CREATE TABLE IF NOT EXISTS places_directory (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  address    TEXT NOT NULL DEFAULT '',
  region     TEXT NOT NULL DEFAULT 'all',
  -- 'lakewood' | 'brooklyn' | 'crown_heights' | 'monsey' |
  -- 'five_towns' | 'queens' | 'passaic' | 'teaneck' |
  -- 'staten_island' | 'other_nj' | 'other_ny'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT places_directory_name_unique UNIQUE (name)
);

-- Enable RLS (same policy as events table)
ALTER TABLE places_directory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON places_directory;
CREATE POLICY "Allow all" ON places_directory FOR ALL USING (true);
