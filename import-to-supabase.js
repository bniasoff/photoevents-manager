const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://wkdjsvciamugtiidqafa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VhNtFhqmUJxE2Lxxyl9GmA_FW7hMbA4';

// CSV file to import
const CSV_FILE = process.argv[2] || 'photoevents-export-2026-01-28T19-21-14.csv';

/**
 * Parse CSV line handling quotes and commas
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push last field
  values.push(current.trim());
  return values;
}

/**
 * Convert MongoDB boolean strings to actual booleans
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1';
  }
  return false;
}

/**
 * Parse numeric value
 */
function parseNumber(value) {
  if (!value || value.trim() === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Convert MongoDB event to Supabase format
 */
function convertToSupabaseFormat(row, headers) {
  const event = {};

  headers.forEach((header, index) => {
    event[header] = row[index];
  });

  return {
    mongodb_id: event._id || null,
    name: event.Name || '',
    event_date: event.EventDate || null,
    start_time: event.Start || null,
    end_time: event.End || null,
    category: event.Category || null,
    place: event.Place || null,
    address: event.Address || null,
    phone: event.Phone || null,
    charge: parseNumber(event.Charge),
    payment: parseNumber(event.Payment),
    balance: parseNumber(event.Bal),
    paid: parseBoolean(event.Paid),
    ready: parseBoolean(event.Ready),
    sent: parseBoolean(event.Sent),
    info: event.Info || null,
    todo: event.ToDo || null,
    referral: event.Referral || null,
    created_date: event.CreatedDate || event.createdAt || null,
    etag_id: event.EtagID || null,
  };
}

/**
 * Import CSV to Supabase
 */
async function importToSupabase() {
  console.log('=== MongoDB to Supabase Import ===\n');

  // Validate configuration
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || SUPABASE_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    console.error('❌ Error: Supabase credentials not configured!');
    console.error('\nPlease either:');
    console.error('  1. Set environment variables:');
    console.error('     SET SUPABASE_URL=your_url');
    console.error('     SET SUPABASE_ANON_KEY=your_key');
    console.error('\n  2. Or edit import-to-supabase.js and replace the placeholders');
    process.exit(1);
  }

  // Initialize Supabase client
  console.log('Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✓ Connected\n');

  // Read CSV file
  console.log(`Reading CSV file: ${CSV_FILE}`);
  const csvPath = path.join(__dirname, CSV_FILE);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  console.log(`✓ Found ${lines.length - 1} events to import\n`);

  // Parse CSV
  const headers = parseCSVLine(lines[0]);
  const events = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const event = convertToSupabaseFormat(row, headers);
    events.push(event);
  }

  console.log(`Parsed ${events.length} events`);
  console.log('Sample event:', JSON.stringify(events[0], null, 2));
  console.log('\n');

  // Import in batches (Supabase has a limit)
  const BATCH_SIZE = 100;
  let imported = 0;
  let failed = 0;

  console.log('Starting import...\n');

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(events.length / BATCH_SIZE);

    console.log(`Importing batch ${batchNum}/${totalBatches} (${batch.length} events)...`);

    try {
      const { data, error } = await supabase
        .from('events')
        .insert(batch);

      if (error) {
        console.error(`  ❌ Error in batch ${batchNum}:`, error.message);
        failed += batch.length;

        // Show first event in batch for debugging
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          console.error('  Note: Some events may already exist in the database');
        } else {
          console.error('  First event in failed batch:', JSON.stringify(batch[0], null, 2));
        }
      } else {
        imported += batch.length;
        console.log(`  ✓ Imported ${batch.length} events`);
      }
    } catch (err) {
      console.error(`  ❌ Exception in batch ${batchNum}:`, err.message);
      failed += batch.length;
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n=== Import Complete ===');
  console.log(`✓ Successfully imported: ${imported} events`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} events`);
  }
  console.log(`Total processed: ${imported + failed} events`);
}

// Run the import
importToSupabase().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
