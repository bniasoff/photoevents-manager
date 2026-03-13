/**
 * Seed the `places` table with known Jewish Orthodox simcha halls.
 * Run AFTER creating the table with create-places-table.sql:
 *   node seed-places.js
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wkdjsvciamugtiidqafa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VhNtFhqmUJxE2Lxxyl9GmA_FW7hMbA4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const places = [
  // ── Lakewood, NJ 08701 ──────────────────────────────────────────────────
  { name: 'Ateres Blima',                   address: '400 Oak St, Lakewood, NJ 08701',            region: 'lakewood' },
  { name: 'Ateres Esther',                  address: '400 Oak St, Lakewood, NJ 08701',            region: 'lakewood' },
  { name: 'Ateres Chana Hall (Bais Faiga)', address: '350 Courtney Rd, Lakewood, NJ 08701',       region: 'lakewood' },
  { name: 'Ateres Chaim Elazar',            address: '800 Rockaway Ave, Lakewood, NJ 08701',      region: 'lakewood' },
  { name: 'Ateres Reva (Toras Aron Hall)',  address: '500 Summer Ave, Lakewood, NJ 08701',        region: 'lakewood' },
  { name: 'Bnos Esther Malka',              address: '488 Old Whitesville Rd, Lakewood, NJ 08701',region: 'lakewood' },
  { name: 'Cedar Palace',                   address: '1990 Swarthmore Ave, Lakewood, NJ 08701',   region: 'lakewood' },
  { name: 'Eagle Ridge Golf Club',          address: '2 Augusta Blvd, Lakewood, NJ 08701',        region: 'lakewood' },
  { name: 'Fountain Ballroom',              address: '725 Vassar Ave, Lakewood, NJ 08701',        region: 'lakewood' },
  { name: "KZY Hall (Khal Zichron Yaakov)", address: '175 Sunset Rd, Lakewood, NJ 08701',         region: 'lakewood' },
  { name: 'Lake Terrace Hall',              address: '1690 Oak St, Lakewood, NJ 08701',           region: 'lakewood' },
  { name: "N'eemas Hachaim Hall",           address: '555 Oak St, Lakewood, NJ 08701',            region: 'lakewood' },
  { name: 'Tiferes Bais Yaakov',            address: '613 Oak St, Lakewood, NJ 08701',            region: 'lakewood' },
  // Toms River / nearby NJ
  { name: 'Chabad of Toms River',           address: '2001 Church Rd, Toms River, NJ 08753',      region: 'lakewood' },
  { name: "Khal M'Kadshai Hashem",          address: '2461 Whitesville Rd, Toms River, NJ 08755', region: 'lakewood' },

  // ── Brooklyn, NY ─────────────────────────────────────────────────────────
  // Boro Park
  { name: 'Belz Hall (Elegant Manor)',      address: '1260 45th St, Brooklyn, NY 11219',          region: 'brooklyn' },
  { name: 'Bikovsker Hall',                 address: '1559 59th St, Brooklyn, NY 11219',          region: 'brooklyn' },
  { name: 'Burshtiner Hall',                address: '5610 12th Ave, Brooklyn, NY 11219',         region: 'brooklyn' },
  { name: 'Kesser Hall',                    address: '4712 12th Ave, Brooklyn, NY 11219',         region: 'brooklyn' },
  { name: 'Skolya Simcha Hall',             address: '928 51st St, Brooklyn, NY 11219',           region: 'brooklyn' },
  { name: 'Spinka Hall',                    address: '1466 56th St, Brooklyn, NY 11219',          region: 'brooklyn' },
  // Williamsburg
  { name: 'Ateres Avrohom',                 address: '75 Ross St, Brooklyn, NY 11211',            region: 'brooklyn' },
  // Flatbush / Kensington
  { name: 'Ateres Matel Leah',              address: '60 W End Ave, Brooklyn, NY 11235',          region: 'brooklyn' },
  { name: "Sasson V'Simcha",                address: '1223 Coney Island Ave, Brooklyn, NY 11230', region: 'brooklyn' },
  { name: 'Tiferes Mordechai',              address: '600 McDonald Ave, Brooklyn, NY 11218',      region: 'brooklyn' },
  { name: 'The Palace',                     address: '780 McDonald Ave, Brooklyn, NY 11218',      region: 'brooklyn' },
  // Boro Park
  { name: 'Tiferes Rivka',                  address: '1257 38th St, Brooklyn, NY 11218',          region: 'brooklyn' },

  // ── Crown Heights, Brooklyn ──────────────────────────────────────────────
  { name: 'Albany Manor',                   address: '585 Albany Ave, Brooklyn, NY 11213',        region: 'crown_heights' },
  { name: 'Lubavitch Yeshivah Hall',        address: '570 Crown St, Brooklyn, NY 11213',          region: 'crown_heights' },
  { name: 'Oholei Torah Hall',              address: '667 Eastern Pkwy, Brooklyn, NY 11213',      region: 'crown_heights' },
  { name: 'RAZAG Ballroom',                 address: '739 East New York Ave, Brooklyn, NY 11203', region: 'crown_heights' },
];

async function seed() {
  console.log(`Seeding ${places.length} places...`);

  const { data, error } = await supabase
    .from('places')
    .upsert(places, { onConflict: 'name' })
    .select();

  if (error) {
    console.error('Error seeding places:', error.message);
    process.exit(1);
  }

  console.log(`✓ Inserted/updated ${data.length} places.`);
  const byRegion = { lakewood: [], brooklyn: [], crown_heights: [] };
  data.forEach(p => byRegion[p.region]?.push(p.name));
  console.log(`\nLakewood area (${byRegion.lakewood.length}):`);
  byRegion.lakewood.forEach(n => console.log(`  • ${n}`));
  console.log(`\nBrooklyn (${byRegion.brooklyn.length}):`);
  byRegion.brooklyn.forEach(n => console.log(`  • ${n}`));
  console.log(`\nCrown Heights (${byRegion.crown_heights.length}):`);
  byRegion.crown_heights.forEach(n => console.log(`  • ${n}`));
}

seed();
