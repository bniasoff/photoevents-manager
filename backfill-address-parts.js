/**
 * Backfill street / city / state / zip from the existing combined `address`
 * column on places_directory, events, and event_locations.
 *
 * Parsing: looks for a trailing "City, ST ZIP" or "City, ST" pattern at the end
 * of the address. Whatever's left becomes `street`. If no such pattern is found,
 * the whole address is treated as `street` and a default city/state/zip is used.
 *
 * Defaults when nothing can be parsed out of the address:
 *   - events / event_locations (actual bookings): Lakewood, NJ 08701 — most
 *     bookings are local and the address was just typed as a street name.
 *   - places_directory: defaulted per the venue's existing `region` column
 *     (lakewood/brooklyn/crown_heights/monsey/passaic/teaneck/queens/
 *     staten_island/five_towns) since venues span 9 different regions and
 *     forcing all of them to "Lakewood, NJ" would misclassify real venues.
 *     five_towns, brooklyn, crown_heights and queens span multiple zip codes,
 *     so zip is left blank there for manual entry.
 *
 * Usage:
 *   node backfill-address-parts.js --dry-run            (default — prints what it would do)
 *   node backfill-address-parts.js --write              (applies the updates)
 *   node backfill-address-parts.js --write --force       (re-processes rows even if street is
 *                                                          already set — use after a parsing fix)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wkdjsvciamugtiidqafa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VhNtFhqmUJxE2Lxxyl9GmA_FW7hMbA4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fs = require('fs');

const WRITE = process.argv.includes('--write');
const FORCE = process.argv.includes('--force');
const REVIEW_CSV_PATH = 'address-backfill-review3.csv';

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const REGION_DEFAULTS = {
  lakewood:      { city: 'Lakewood',      state: 'NJ', zip: '08701' },
  brooklyn:      { city: 'Brooklyn',      state: 'NY', zip: '' },
  crown_heights: { city: 'Brooklyn',      state: 'NY', zip: '' },
  monsey:        { city: 'Monsey',        state: 'NY', zip: '10952' },
  five_towns:    { city: '',              state: 'NY', zip: '' },
  queens:        { city: 'Queens',        state: 'NY', zip: '' },
  passaic:       { city: 'Passaic',       state: 'NJ', zip: '07055' },
  teaneck:       { city: 'Teaneck',       state: 'NJ', zip: '07666' },
  staten_island: { city: 'Staten Island', state: 'NY', zip: '' },
};
const EVENT_DEFAULT = { city: 'Lakewood', state: 'NJ', zip: '08701' };

// Finds a standalone NY/NJ state abbreviation anywhere in the address (the only two states
// this app operates in — case-insensitive, since older data has "Nj"/"nj"), preferring the
// last match since the state almost always appears near the end.
const STATE_TOKEN = /\b(NY|NJ)\b/gi;

// Real multi-word city/neighborhood names seen in this dataset's no-comma addresses
// ("123 Main St Spring Valley NY"). Without this, the single-last-word fallback below
// would chop "Spring Valley" down to "Valley", "Staten Island" down to "Island", etc.
// Ordered longest-first so "Kew Gardens Hills" wins over the shorter "Kew Gardens".
const MULTI_WORD_CITIES = [
  'Kew Gardens Hills',
  'Staten Island',
  'Spring Valley',
  'Toms River',
  'Chestnut Ridge',
  'Far Rockaway',
  'Wesley Hills',
  'New Square',
  'Kew Gardens',
].sort((a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length);

function matchMultiWordCity(before) {
  const lower = before.toLowerCase().replace(/'/g, '');
  for (const city of MULTI_WORD_CITIES) {
    const cityLower = city.toLowerCase();
    if (lower === cityLower) return { city, street: '' };
    if (lower.endsWith(' ' + cityLower)) {
      return { city, street: before.slice(0, before.length - city.length).trim() };
    }
  }
  return null;
}

// Historical addresses mix punctuation wildly — "Street, City, ST zip", "Street, City ST, zip",
// "Street,City,ST,zip", spelled-out "New Jersey", no state at all — so this parses in stages
// rather than with one fixed-shape regex. `parsed: true` means something real (state and/or a
// city name) was pulled out of the text; `parsed: false` means pure fallback.
function splitAddress(address, fallback) {
  let addr = (address || '').trim();
  if (!addr) return { street: '', city: fallback.city, state: fallback.state, zip: fallback.zip, parsed: false };

  // Strip a trailing country suffix like ", USA" (tolerating the occasional typo "USAe"/"USAt")
  addr = addr.replace(/,?\s*USA[a-zA-Z]?\s*$/, '').trim();
  // Normalize spelled-out states so the token search below catches them too
  addr = addr.replace(/\bnew\s+jersey\b/gi, 'NJ').replace(/\bnew\s+york\b/gi, 'NY');

  let stateMatch = null;
  let m;
  STATE_TOKEN.lastIndex = 0;
  while ((m = STATE_TOKEN.exec(addr))) stateMatch = m;

  if (stateMatch) {
    const state = stateMatch[1].toUpperCase();
    const before = addr.slice(0, stateMatch.index).trim().replace(/,$/, '').trim();
    const after = addr.slice(stateMatch.index + state.length).replace(/^,/, '').trim();
    const zipMatch = after.match(/^(\d{4,5}(?:-\d{4})?)/);

    let street = before;
    let city = fallback.city;
    const lastComma = before.lastIndexOf(',');
    if (lastComma !== -1) {
      city = before.slice(lastComma + 1).trim();
      street = before.slice(0, lastComma).trim();
    } else {
      const mw = matchMultiWordCity(before);
      if (mw) {
        city = mw.city;
        street = mw.street;
      } else {
        const words = before.split(' ').filter(Boolean);
        if (words.length > 1) {
          city = words[words.length - 1];
          street = words.slice(0, -1).join(' ');
        }
      }
    }
    city = city || fallback.city;
    // Only fall back to the default zip when the parsed city actually matches the default's
    // city (e.g. Lakewood) — a Howell or Brick address has no business inheriting 08701.
    const sameCityAsFallback = city.toLowerCase() === (fallback.city || '').toLowerCase();
    let zip = zipMatch ? zipMatch[1] : '';
    if (zip && !sameCityAsFallback && fallback.zip && zip === fallback.zip) {
      // The address literally contains the default zip (e.g. "08701") but the city isn't
      // the default city — almost certainly a copy-pasted/habitual zip, not a real one.
      zip = '';
    } else if (!zip && sameCityAsFallback) {
      zip = fallback.zip || '';
    }
    return { street, city, state, zip, parsed: true };
  }

  // No NY/NJ found — if the address still ends in a plain comma-separated city name
  // (no digits), keep it rather than overwriting it with the Lakewood/region default.
  const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (/^[A-Za-z][A-Za-z .'-]*$/.test(last) && last.split(' ').filter(Boolean).length <= 3) {
      const sameCityAsFallback = last.toLowerCase() === (fallback.city || '').toLowerCase();
      return {
        street: parts.slice(0, -1).join(', '),
        city: last,
        state: fallback.state,
        zip: sameCityAsFallback ? (fallback.zip || '') : '',
        parsed: true,
      };
    }
  }

  return { street: addr, city: fallback.city, state: fallback.state, zip: fallback.zip, parsed: false };
}

async function processTable(table, selectCols, idCol, addressCol, fallbackFor, csvRows) {
  const { data, error } = await supabase.from(table).select(selectCols);
  if (error) {
    console.error(`Failed to fetch ${table}:`, error.message);
    return;
  }
  console.log(`\n=== ${table} (${data.length} rows) ===`);

  let parsedFromAddress = 0;
  let usedDefault = 0;
  const updates = [];

  for (const row of data) {
    // Skip rows that already have a parsed street — street has no column DEFAULT on any
    // table, so it reliably means "already backfilled". city/state/zip can't be used for
    // this check: events/event_locations have DEFAULT 'Lakewood'/'NJ'/'08701' on those
    // columns, which Postgres applies to every existing row the moment the column is
    // added — so they're non-empty even on rows this script has never touched.
    // --force bypasses this to re-process every row (e.g. after a parsing-logic fix).
    if (row.street && !FORCE) continue;

    const fallback = fallbackFor(row);
    const parts = splitAddress(row[addressCol], fallback);
    if (parts.parsed) parsedFromAddress++; else usedDefault++;

    updates.push({
      id: row[idCol], street: parts.street, city: parts.city, state: parts.state, zip: parts.zip,
      _original: row[addressCol], _source: parts.parsed ? 'parsed' : 'default',
    });
  }

  console.log(`  Parsed city/state/zip directly from address: ${parsedFromAddress}`);
  console.log(`  Used fallback default (no city/state/zip found in address): ${usedDefault}`);

  if (csvRows) {
    for (const u of updates) {
      csvRows.push([table, u.id, u._original, u.street, u.city, u.state, u.zip, u._source]);
    }
  }

  if (!WRITE) {
    console.log(`  (dry run — nothing written. Re-run with --write to apply these ${updates.length} updates.)`);
    return;
  }

  for (const u of updates) {
    const { error: updateError } = await supabase
      .from(table)
      .update({ street: u.street, city: u.city, state: u.state, zip: u.zip })
      .eq(idCol, u.id);
    if (updateError) {
      console.error(`  Failed to update ${table} row ${u.id}:`, updateError.message);
    }
  }
  console.log(`  Wrote ${updates.length} updates to ${table}.`);
}

(async () => {
  console.log(WRITE ? 'Running in WRITE mode.' : 'Running in DRY-RUN mode (pass --write to apply).');

  const csvRows = WRITE ? null : [['table', 'id', 'original_address', 'street', 'city', 'state', 'zip', 'source']];

  await processTable('places_directory', 'id, address, region, street, city, state, zip', 'id', 'address',
    (row) => REGION_DEFAULTS[row.region] || REGION_DEFAULTS.lakewood, csvRows);

  await processTable('events', 'id, address, street, city, state, zip', 'id', 'address', () => EVENT_DEFAULT, csvRows);

  await processTable('event_locations', 'id, address, street, city, state, zip', 'id', 'address', () => EVENT_DEFAULT, csvRows);

  if (csvRows) {
    const csv = csvRows.map((r) => r.map(csvEscape).join(',')).join('\n');
    fs.writeFileSync(REVIEW_CSV_PATH, csv);
    console.log(`\nFull preview written to ${REVIEW_CSV_PATH} (${csvRows.length - 1} rows) — open it in Excel to review before running --write.`);
  }

  console.log('\nDone.');
})();
