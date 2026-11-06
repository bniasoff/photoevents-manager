/**
 * Import 2021/2022 events from PhotoEvents.photoevents.csv into Supabase.
 * Run from photoevents-backend/ directory: node import-old-events.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wkdjsvciamugtiidqafa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VhNtFhqmUJxE2Lxxyl9GmA_FW7hMbA4';

// CSV is one level up from this script
const CSV_FILE = path.join(__dirname, '..', 'PhotoEvents.photoevents.csv');

// Only import events from these years
const IMPORT_YEARS = [2021, 2022];

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  const lower = (value || '').toLowerCase().trim();
  return lower === 'true' || lower === '1';
}

function parseNumber(value) {
  if (!value || value.trim() === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function parseDate(value) {
  if (!value || value.trim() === '') return null;
  // Handle both ISO and other formats
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return value.trim();
}

async function run() {
  console.log('=== Import 2021/2022 Events into Supabase ===\n');

  if (!fs.existsSync(CSV_FILE)) {
    console.error('❌ CSV not found:', CSV_FILE);
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);

  console.log('CSV headers:', headers.join(', '));
  console.log(`Total CSV rows: ${lines.length - 1}\n`);

  // Parse all rows and filter to target years
  const toImport = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx] || ''; });

    // Filter by EventDate year
    if (!obj.EventDate) continue;
    const year = new Date(obj.EventDate).getFullYear();
    if (!IMPORT_YEARS.includes(year)) continue;

    toImport.push({
      mongodb_id: obj._id || null,
      name: obj.Name || '',
      event_date: parseDate(obj.EventDate),
      start_time: obj.Start || null,
      end_time: obj.End || null,
      category: obj.Category || null,
      place: obj.Place || null,
      address: obj.Address || null,
      phone: obj.Phone || null,
      charge: parseNumber(obj.Charge),
      payment: parseNumber(obj.Payment),
      balance: parseNumber(obj.Bal),
      paid: parseBoolean(obj.Paid),
      ready: parseBoolean(obj.Ready),
      sent: parseBoolean(obj.Sent),
      info: obj.Info || null,
      todo: obj.ToDo || null,
      referral: obj.Refferral || obj.Referral || null,
      created_date: parseDate(obj.CreatedDate) || parseDate(obj.createdAt) || null,
      etag_id: obj.EtagID || null,
    });
  }

  console.log(`Events to import (${IMPORT_YEARS.join(', ')}): ${toImport.length}`);

  // Show year breakdown
  const byYear = {};
  toImport.forEach(e => {
    const y = new Date(e.event_date).getFullYear();
    byYear[y] = (byYear[y] || 0) + 1;
  });
  Object.keys(byYear).sort().forEach(y => console.log(`  ${y}: ${byYear[y]} events`));
  console.log('');

  if (toImport.length === 0) {
    console.log('Nothing to import.');
    return;
  }

  // Check for existing mongodb_ids to avoid duplicates
  console.log('Checking for existing records...');
  const mongoIds = toImport.map(e => e.mongodb_id).filter(Boolean);
  const { data: existing } = await supabase
    .from('events')
    .select('mongodb_id')
    .in('mongodb_id', mongoIds);

  const existingIds = new Set((existing || []).map(e => e.mongodb_id));
  const newEvents = toImport.filter(e => !existingIds.has(e.mongodb_id));

  console.log(`Already in Supabase: ${existingIds.size}`);
  console.log(`New events to insert: ${newEvents.length}\n`);

  if (newEvents.length === 0) {
    console.log('✓ All events already exist in Supabase. Nothing to do.');
    return;
  }

  // Import in batches of 100
  const BATCH_SIZE = 100;
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < newEvents.length; i += BATCH_SIZE) {
    const batch = newEvents.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(newEvents.length / BATCH_SIZE);

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length} events)... `);

    const { error } = await supabase.from('events').insert(batch);

    if (error) {
      console.error(`❌ ${error.message}`);
      console.error('  First event:', JSON.stringify(batch[0], null, 2));
      failed += batch.length;
    } else {
      console.log('✓');
      imported += batch.length;
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=== Done ===');
  console.log(`✓ Imported: ${imported}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);
}

run().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
