-- Supabase Table Schema for Photo Events
-- Run this in your Supabase SQL Editor to create the table

-- Create the events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongodb_id TEXT UNIQUE, -- Original MongoDB _id for reference
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  start_time TEXT,
  end_time TEXT,
  category TEXT,
  place TEXT,
  address TEXT,
  phone TEXT,
  charge NUMERIC(10, 2),
  payment NUMERIC(10, 2),
  balance NUMERIC(10, 2),
  paid BOOLEAN DEFAULT FALSE,
  ready BOOLEAN DEFAULT FALSE,
  sent BOOLEAN DEFAULT FALSE,
  info TEXT,
  todo TEXT,
  referral TEXT,
  created_date TIMESTAMPTZ,
  etag_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_paid ON events(paid);
CREATE INDEX IF NOT EXISTS idx_events_ready ON events(ready);
CREATE INDEX IF NOT EXISTS idx_events_sent ON events(sent);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
-- IMPORTANT: Adjust this policy based on your security requirements
CREATE POLICY "Enable all operations for authenticated users"
  ON events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Optional: Allow read access for anonymous users (public API)
-- Uncomment if you want your API to be publicly readable
-- CREATE POLICY "Enable read access for anonymous users"
--   ON events
--   FOR SELECT
--   TO anon
--   USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE events IS 'Photo events management table - migrated from MongoDB';
