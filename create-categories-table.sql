-- Create the shared categories table (replaces the hardcoded category lists
-- duplicated across the mobile app and web app). Run this in the Supabase SQL
-- editor (frontend instance, same one as places_directory).

CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT categories_name_unique UNIQUE (name)
);

-- Enable RLS (same policy as events / places_directory)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON categories;
CREATE POLICY "Allow all" ON categories FOR ALL USING (true);

-- Seed with the union of every category list found across the app
-- (mobile's CreateEventModal/EventDetailModal list + the canonical
-- CATEGORY_ORDER list), de-duplicated and with 'Opsherin' unified to the
-- canonical spelling 'Apsherin'. 'Other' is pinned last via sort_order 1000;
-- new categories added from the app get inserted just above it.
INSERT INTO categories (name, sort_order) VALUES
  ('Bar Mitzvah', 1),
  ('Bat Mitzvah', 2),
  ('Wedding', 3),
  ('Vort', 4),
  ('Bris', 5),
  ('Pidyon Haben', 6),
  ('School', 7),
  ('Photoshoot', 8),
  ('CM', 9),
  ('Parlor Meeting', 10),
  ('Siyum', 11),
  ('L''Chaim', 12),
  ('Chanukas Habayis', 13),
  ('Melava Malka', 14),
  ('Presentation', 15),
  ('Shiur', 16),
  ('Advertisements', 17),
  ('Apsherin', 18),
  ('Beis Medrash', 19),
  ('Birthday', 20),
  ('Chumesh Mesiba', 21),
  ('Chumesh Party', 22),
  ('Conference', 23),
  ('Dinner', 24),
  ('Even Hapina', 25),
  ('Hachnosas Sefer Torah', 26),
  ('Kollel', 27),
  ('Seudas Hodah', 28),
  ('Sheva Brachos', 29),
  ('Vachtnact', 30),
  ('Yeshiva', 31),
  ('Yorzeit', 32),
  ('Other', 1000)
ON CONFLICT (name) DO NOTHING;
