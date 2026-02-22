-- Migration: Rename 'wineman' column to 'weinman'
-- Run this in your Supabase SQL Editor to update the existing database
-- Go to: https://wkdjsvciamugtiidqafa.supabase.co/project/default/sql

-- Rename the column from 'wineman' to 'weinman'
ALTER TABLE events RENAME COLUMN wineman TO weinman;

-- Verify the change
COMMENT ON COLUMN events.weinman IS 'Weinman checkbox field - renamed from wineman';
