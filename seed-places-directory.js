/**
 * Merge the master-venues.csv with the existing `places` table
 * and upsert everything into `places_directory`.
 *
 * Steps:
 *   1. Parse Venues/master-venues.csv  (294 venues from PDFs)
 *   2. Fetch all rows from existing `places` table  (your hand-curated data)
 *   3. Merge: your existing data wins on name conflict
 *   4. Upsert the merged list into `places_directory`
 *
 * Run AFTER creating the table:
 *   node seed-places-directory.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://wkdjsvciamugtiidqafa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VhNtFhqmUJxE2Lxxyl9GmA_FW7hMbA4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 1. Parse CSV ────────────────────────────────────────────────────────────
function parseCsv(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const venues = [];
  for (let i = 1; i < lines.length; i++) {   // skip header
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields (address may contain commas)
    const parts = [];
    let cur = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { parts.push(cur); cur = ''; continue; }
      cur += ch;
    }
    parts.push(cur);

    const [name, address, region] = parts.map(s => s.trim());
    if (name && region) venues.push({ name, address: address || '', region });
  }
  return venues;
}

// ── 2. Main ─────────────────────────────────────────────────────────────────
async function seed() {
  console.log('Reading master-venues.csv…');
  const csvPath = path.join(__dirname, 'Venues', 'master-venues.csv');
  const csvVenues = parseCsv(csvPath);
  console.log(`  CSV: ${csvVenues.length} venues`);

  console.log('Fetching existing places table…');
  const { data: existingPlaces, error } = await supabase
    .from('places')
    .select('name, address, region');
  if (error) {
    console.error('Error fetching places table:', error.message);
    process.exit(1);
  }
  console.log(`  Existing places table: ${existingPlaces.length} venues`);

  // ── 3. Merge — build map keyed by lowercase name ─────────────────────────
  // CSV data goes in first, then existing `places` data overwrites (wins on conflict)
  const map = new Map();

  csvVenues.forEach(v => {
    map.set(v.name.toLowerCase(), {
      name:    v.name,
      address: v.address,
      region:  v.region,
    });
  });

  existingPlaces.forEach(v => {
    // Existing hand-curated data wins — overwrites CSV entry if same name
    map.set(v.name.toLowerCase(), {
      name:    v.name,
      address: v.address || '',
      region:  v.region  || 'all',
    });
  });

  const merged = Array.from(map.values());
  console.log(`\nMerged total (deduplicated): ${merged.length} venues`);

  // ── 4. Upsert into places_directory ─────────────────────────────────────
  // Batch in chunks of 100 to stay under Supabase limits
  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < merged.length; i += CHUNK) {
    const chunk = merged.slice(i, i + CHUNK);
    const { error: upsertError } = await supabase
      .from('places_directory')
      .upsert(chunk, { onConflict: 'name' });
    if (upsertError) {
      console.error(`Error upserting chunk ${i}–${i + CHUNK}:`, upsertError.message);
      process.exit(1);
    }
    inserted += chunk.length;
    process.stdout.write(`\r  Upserted ${inserted}/${merged.length}…`);
  }
  console.log('\n✓ Done!');

  // ── Summary by region ────────────────────────────────────────────────────
  const byRegion = {};
  merged.forEach(v => {
    byRegion[v.region] = (byRegion[v.region] || 0) + 1;
  });
  console.log('\nVenues per region:');
  Object.entries(byRegion)
    .sort((a, b) => b[1] - a[1])
    .forEach(([r, n]) => console.log(`  ${r.padEnd(15)} ${n}`));
}

seed();
