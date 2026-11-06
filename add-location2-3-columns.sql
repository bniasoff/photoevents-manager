-- Add second and third location fields to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS place2 TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS address2 TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS place3 TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS address3 TEXT;

-- Add second and third phone number fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS phone2 TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS phone3 TEXT;
