-- Create standalone places/venues table
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS places (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT 'all',   -- 'lakewood' | 'brooklyn' | 'crown_heights' | 'all'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT places_name_unique UNIQUE (name)
);

-- Add region column if it doesn't exist yet
ALTER TABLE places ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'all';

-- Enable RLS (match same policy as events table)
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON places;
CREATE POLICY "Allow all" ON places FOR ALL USING (true);

-- ── Lakewood, NJ 08701 ───────────────────────────────────────────────────
INSERT INTO places (name, address, region) VALUES
  ('Ateres Blima',                   '400 Oak St, Lakewood, NJ 08701',           'lakewood'),
  ('Ateres Esther',                  '400 Oak St, Lakewood, NJ 08701',           'lakewood'),
  ('Ateres Chana Hall (Bais Faiga)', '350 Courtney Rd, Lakewood, NJ 08701',      'lakewood'),
  ('Ateres Chaim Elazar',            '800 Rockaway Ave, Lakewood, NJ 08701',     'lakewood'),
  ('Ateres Reva (Toras Aron Hall)',  '500 Summer Ave, Lakewood, NJ 08701',       'lakewood'),
  ('Bnos Esther Malka',              '488 Old Whitesville Rd, Lakewood, NJ 08701','lakewood'),
  ('Cedar Palace',                   '1990 Swarthmore Ave, Lakewood, NJ 08701',  'lakewood'),
  ('Eagle Ridge Golf Club',          '2 Augusta Blvd, Lakewood, NJ 08701',       'lakewood'),
  ('Fountain Ballroom',              '725 Vassar Ave, Lakewood, NJ 08701',       'lakewood'),
  ('KZY Hall (Khal Zichron Yaakov)', '175 Sunset Rd, Lakewood, NJ 08701',        'lakewood'),
  ('Lake Terrace Hall',              '1690 Oak St, Lakewood, NJ 08701',          'lakewood'),
  ('N''eemas Hachaim Hall',          '555 Oak St, Lakewood, NJ 08701',           'lakewood'),
  ('Tiferes Bais Yaakov',            '613 Oak St, Lakewood, NJ 08701',           'lakewood'),
-- Toms River / nearby NJ
  ('Chabad of Toms River',           '2001 Church Rd, Toms River, NJ 08753',     'lakewood'),
  ('Khal M''Kadshai Hashem',         '2461 Whitesville Rd, Toms River, NJ 08755','lakewood'),

-- ── Brooklyn, NY ─────────────────────────────────────────────────────────
-- Boro Park
  ('Belz Hall (Elegant Manor)',      '1260 45th St, Brooklyn, NY 11219',         'brooklyn'),
  ('Bikovsker Hall',                 '1559 59th St, Brooklyn, NY 11219',         'brooklyn'),
  ('Burshtiner Hall',                '5610 12th Ave, Brooklyn, NY 11219',        'brooklyn'),
  ('Kesser Hall',                    '4712 12th Ave, Brooklyn, NY 11219',        'brooklyn'),
  ('Skolya Simcha Hall',             '928 51st St, Brooklyn, NY 11219',          'brooklyn'),
  ('Spinka Hall',                    '1466 56th St, Brooklyn, NY 11219',         'brooklyn'),
-- Williamsburg
  ('Ateres Avrohom',                 '75 Ross St, Brooklyn, NY 11211',           'brooklyn'),
-- Flatbush / Kensington
  ('Ateres Matel Leah',              '60 W End Ave, Brooklyn, NY 11235',         'brooklyn'),
  ('Sasson V''Simcha',               '1223 Coney Island Ave, Brooklyn, NY 11230','brooklyn'),
  ('Tiferes Mordechai',              '600 McDonald Ave, Brooklyn, NY 11218',     'brooklyn'),
  ('The Palace',                     '780 McDonald Ave, Brooklyn, NY 11218',     'brooklyn'),
-- Boro Park
  ('Tiferes Rivka',                  '1257 38th St, Brooklyn, NY 11218',         'brooklyn'),

-- ── Crown Heights, Brooklyn ───────────────────────────────────────────────
  ('Albany Manor',                   '585 Albany Ave, Brooklyn, NY 11213',       'crown_heights'),
  ('Lubavitch Yeshivah Hall',        '570 Crown St, Brooklyn, NY 11213',         'crown_heights'),
  ('Oholei Torah Hall',              '667 Eastern Pkwy, Brooklyn, NY 11213',     'crown_heights'),
  ('RAZAG Ballroom',                 '739 East New York Ave, Brooklyn, NY 11203','crown_heights')

ON CONFLICT (name) DO UPDATE SET address = EXCLUDED.address, region = EXCLUDED.region;
