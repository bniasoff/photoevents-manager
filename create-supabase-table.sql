-- Run this in Supabase SQL Editor to create the events table
-- Go to: https://wkdjsvciamugtiidqafa.supabase.co/project/default/sql

-- Create the events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongodb_id TEXT UNIQUE,
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
  simcha_initiative BOOLEAN DEFAULT FALSE,
  projector BOOLEAN DEFAULT FALSE,
  weinman BOOLEAN DEFAULT FALSE,
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
CREATE POLICY "Enable all operations for all users"
  ON events
  FOR ALL
  USING (true)
  WITH CHECK (true);

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
