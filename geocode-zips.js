/**
 * Fills in blank `zip` values (street/city/state already backfilled by
 * backfill-address-parts.js) by geocoding the real street address via the free
 * OpenStreetMap Nominatim API — gives an accurate per-address zip instead of a
 * single guessed zip for areas that span many zip codes (Brooklyn, Staten Island).
 *
 * Rate-limited to 1 request/second per Nominatim's usage policy
 * (https://operations.osmfoundation.org/policies/nominatim/).
 *
 * Usage:
 *   node geocode-zips.js --dry-run   (default — prints what it would do, writes a CSV)
 *   node geocode-zips.js --write     (applies the updates)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://wkdjsvciamugtiidqafa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VhNtFhqmUJxE2Lxxyl9GmA_FW7hMbA4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const WRITE = process.argv.includes('--write');
const REVIEW_CSV_PATH = 'zip-geocode-review.csv';
const USER_AGENT = 'PhotoEventsApp/1.0 (address zip backfill; contact: bniasoff@hotmail.com)';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Nominatim represents NYC boroughs under city="New York" with the borough as a
// suburb/county, not as the city itself — so a plain city="Staten Island" query
// finds no house-level matches. Map our city names to what Nominatim expects.
const CITY_OVERRIDES = {
  'staten island': 'New York',
  'brooklyn': 'New York',
  'kew gardens': 'New York',
  'kew gardens hills': 'New York',
  'far rockaway': 'New York',
};

async function geocode(street, city, state) {
  const queryCity = CITY_OVERRIDES[city.toLowerCase()] || city;
  const params = new URLSearchParams({
    format: 'json',
    addressdetails: '1',
    limit: '1',
    city: queryCity,
    state,
    country: 'US',
  });
  if (street) params.set('street', street);
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const postcode = data?.[0]?.address?.postcode;
  if (!postcode) return null;
  // Nominatim sometimes returns a ZIP+4; keep just the 5-digit part
  return postcode.slice(0, 5);
}

// Strip leading junk left over from malformed source addresses (e.g. a stray leading
// comma from "address" having started with ", 5 Brianwood Court, Jackson, NJ 08701")
function cleanStreet(street) {
  return (street || '').replace(/^[,;\s]+/, '').trim();
}

async function processTable(table, csvRows) {
  const { data, error } = await supabase.from(table).select('id, street, city, state, zip, address').eq('zip', '');
  if (error) {
    console.error(`Failed to fetch ${table}:`, error.message);
    return;
  }
  console.log(`\n=== ${table} (${data.length} rows with blank zip) ===`);

  let found = 0;
  let notFound = 0;
  const updates = [];

  for (const row of data) {
    if (!row.city || !row.state) { notFound++; continue; }
    const street = cleanStreet(row.street);
    let zip = null;
    let precision = 'exact';
    try {
      if (street) zip = await geocode(street, row.city, row.state);
      await sleep(1100); // stay under Nominatim's 1 req/sec limit
      if (!zip) {
        // Fall back to a city-level (centroid) zip rather than leaving it blank —
        // noted as "city" precision in the CSV so it can be told apart from an
        // exact street-level match.
        zip = await geocode(null, row.city, row.state);
        precision = 'city';
        await sleep(1100);
      }
    } catch (e) {
      console.error(`  Geocode error for ${table} row ${row.id}:`, e.message);
    }

    if (zip) {
      found++;
      updates.push({ id: row.id, zip });
      csvRows.push([table, row.id, row.address, street, row.city, row.state, zip, precision]);
    } else {
      notFound++;
      csvRows.push([table, row.id, row.address, street, row.city, row.state, '(not found)', '']);
    }
  }

  console.log(`  Found a zip: ${found}`);
  console.log(`  Not found (left blank): ${notFound}`);

  if (!WRITE) {
    console.log(`  (dry run — nothing written. Re-run with --write to apply these ${updates.length} updates.)`);
    return;
  }

  for (const u of updates) {
    const { error: updateError } = await supabase.from(table).update({ zip: u.zip }).eq('id', u.id);
    if (updateError) console.error(`  Failed to update ${table} row ${u.id}:`, updateError.message);
  }
  console.log(`  Wrote ${updates.length} updates to ${table}.`);
}

(async () => {
  console.log(WRITE ? 'Running in WRITE mode.' : 'Running in DRY-RUN mode (pass --write to apply).');

  const csvRows = [['table', 'id', 'original_address', 'street', 'city', 'state', 'zip_found', 'precision']];

  await processTable('places_directory', csvRows);
  await processTable('events', csvRows);
  await processTable('event_locations', csvRows);

  const csv = csvRows.map((r) => r.map(csvEscape).join(',')).join('\n');
  fs.writeFileSync(REVIEW_CSV_PATH, csv);
  console.log(`\nFull results written to ${REVIEW_CSV_PATH} (${csvRows.length - 1} rows).`);

  console.log('\nDone.');
})();
