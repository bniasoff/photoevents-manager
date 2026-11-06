-- Split addresses into structured parts (street / city / state / zip) on top of
-- the existing single `address` text column. `address` is kept as-is (still the
-- full combined string) since it's what nav apps, Google Calendar export, CSV/PDF
-- exports, and place-name matching already rely on — these new columns are
-- additive structured data that the UI now collects separately and that gets
-- combined into `address` on save, so nothing that already reads `address` breaks.
--
-- Run this in the Supabase SQL editor (frontend instance), THEN run
-- `node backfill-address-parts.js --dry-run` to preview splitting the addresses
-- you already have, and `node backfill-address-parts.js --write` to apply it.

ALTER TABLE places_directory ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE places_directory ADD COLUMN IF NOT EXISTS city   TEXT;
ALTER TABLE places_directory ADD COLUMN IF NOT EXISTS state  TEXT;
ALTER TABLE places_directory ADD COLUMN IF NOT EXISTS zip    TEXT;

ALTER TABLE events ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS city   TEXT DEFAULT 'Lakewood';
ALTER TABLE events ADD COLUMN IF NOT EXISTS state  TEXT DEFAULT 'NJ';
ALTER TABLE events ADD COLUMN IF NOT EXISTS zip    TEXT DEFAULT '08701';

ALTER TABLE event_locations ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE event_locations ADD COLUMN IF NOT EXISTS city   TEXT DEFAULT 'Lakewood';
ALTER TABLE event_locations ADD COLUMN IF NOT EXISTS state  TEXT DEFAULT 'NJ';
ALTER TABLE event_locations ADD COLUMN IF NOT EXISTS zip    TEXT DEFAULT '08701';
