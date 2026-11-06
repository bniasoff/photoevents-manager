const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// PostgreSQL connection string
const CONNECTION_STRING = 'postgresql://postgres:Lakewood1438!!]@db.wkdjsvciamugtiidqafa.supabase.co:5432/postgres';

// CSV file to import
const CSV_FILE = 'photoevents-export-2026-01-28T19-21-14.csv';

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
 * Convert MongoDB event to PostgreSQL format
 */
function convertToPostgresFormat(row, headers) {
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
 * Create table schema
 */
async function createTable(client) {
  console.log('Creating events table...');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mongodb_id TEXT UNIQUE,
      name TEXT NOT NULL,
      event_date TIMESTAMPTZ NOT NULL,
      start_time TEXT,
      end_time TEXT,
      category TEXT,
      place TEXT,
      address TEXT,
      phone TEXT,
      charge NUMERIC(10, 2),
      payment NUMERIC(10, 2),
      balance NUMERIC(10, 2),
      paid BOOLEAN DEFAULT FALSE,
      ready BOOLEAN DEFAULT FALSE,
      sent BOOLEAN DEFAULT FALSE,
      info TEXT,
      todo TEXT,
      referral TEXT,
      created_date TIMESTAMPTZ,
      etag_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
    CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
    CREATE INDEX IF NOT EXISTS idx_events_paid ON events(paid);
    CREATE INDEX IF NOT EXISTS idx_events_ready ON events(ready);
    CREATE INDEX IF NOT EXISTS idx_events_sent ON events(sent);
    CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);
  `;

  await client.query(createTableSQL);
  console.log('✓ Table created successfully\n');
}

/**
 * Import CSV to PostgreSQL
 */
async function importToPostgres() {
  const client = new Client({ connectionString: CONNECTION_STRING });

  try {
    console.log('=== MongoDB to PostgreSQL (Supabase) Import ===\n');

    // Connect to database
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✓ Connected\n');

    // Create table
    await createTable(client);

    // Read CSV file
    console.log(`Reading CSV file: ${CSV_FILE}`);
    const csvPath = path.join(__dirname, CSV_FILE);

    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    console.log(`✓ Found ${lines.length - 1} events to import\n`);

    // Parse CSV
    const headers = parseCSVLine(lines[0]);
    const events = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      const event = convertToPostgresFormat(row, headers);
      events.push(event);
    }

    console.log(`Parsed ${events.length} events`);
    console.log('Sample event:', JSON.stringify(events[0], null, 2));
    console.log('\n');

    // Import events
    console.log('Starting import...\n');

    let imported = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const progress = `[${i + 1}/${events.length}]`;

      try {
        const insertSQL = `
          INSERT INTO events (
            mongodb_id, name, event_date, start_time, end_time, category,
            place, address, phone, charge, payment, balance,
            paid, ready, sent, info, todo, referral, created_date, etag_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (mongodb_id) DO NOTHING
        `;

        const values = [
          event.mongodb_id, event.name, event.event_date, event.start_time, event.end_time,
          event.category, event.place, event.address, event.phone, event.charge, event.payment,
          event.balance, event.paid, event.ready, event.sent, event.info, event.todo,
          event.referral, event.created_date, event.etag_id
        ];

        const result = await client.query(insertSQL, values);

        if (result.rowCount === 0) {
          skipped++;
          if (i % 50 === 0) console.log(`${progress} Skipped (already exists): ${event.name}`);
        } else {
          imported++;
          if (i % 50 === 0) console.log(`${progress} Imported: ${event.name}`);
        }
      } catch (error) {
        failed++;
        console.error(`${progress} ❌ Failed to import: ${event.name}`);
        console.error(`  Error: ${error.message}`);
      }
    }

    console.log('\n=== Import Complete ===');
    console.log(`✓ Successfully imported: ${imported} events`);
    if (skipped > 0) {
      console.log(`⊘ Skipped (duplicates): ${skipped} events`);
    }
    if (failed > 0) {
      console.log(`❌ Failed: ${failed} events`);
    }
    console.log(`Total processed: ${imported + skipped + failed} events`);

    // Verify count
    const countResult = await client.query('SELECT COUNT(*) FROM events');
    console.log(`\n✓ Total events in database: ${countResult.rows[0].count}`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Connection closed');
  }
}

// Run the import
importToPostgres();
