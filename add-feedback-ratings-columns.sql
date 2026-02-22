-- Add Feedback and Ratings columns to events table
-- Run this in your Supabase SQL Editor

-- Add Feedback column (TEXT)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Add Ratings column (INTEGER, 1-5 stars)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS ratings INTEGER CHECK (ratings >= 1 AND ratings <= 5);

-- Add comment
COMMENT ON COLUMN events.feedback IS 'Client feedback about the event';
COMMENT ON COLUMN events.ratings IS 'Client rating (1-5 stars)';
