/**
 * Supabase Full Backup Script
 * Backs up all tables from both Supabase instances to timestamped JSON + CSV files.
 *   - Frontend (photoevents-app): events, places, places_directory
 *   - Backend (photoevents-backend): user_tokens
 * Run manually: node backup-supabase.js
 * Scheduled: see run-backup.bat + Windows Task Scheduler
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Frontend Supabase (app data)
const FRONTEND_URL = 'https://wkdjsvciamugtiidqafa.supabase.co';
const FRONTEND_KEY = 'sb_publishable_VhNtFhqmUJxE2Lxxyl9GmA_FW7hMbA4';

// Backend Supabase (OAuth tokens)
const BACKEND_URL = 'https://crtscrkgsedfwjvmhhlp.supabase.co';
const BACKEND_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNydHNjcmtnc2VkZndqdm1oaGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NzI3MDAsImV4cCI6MjA4NjE0ODcwMH0.COadKA_LqzfIvfkgbs7LVreHHwqZXq9nMc7heQPJ5bQ';

// Backups folder (created automatically)
const BACKUP_DIR = path.join(__dirname, 'backups');

// How many backup files to keep (oldest deleted automatically)
const MAX_BACKUPS = 12;

// ─── helpers ───────────────────────────────────────────────────────────────

function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

function pruneOldBackups(dir, prefix, maxKeep) {
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith(prefix))
    .map((f) => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => a.time - b.time); // oldest first

  while (files.length > maxKeep) {
    const old = files.shift();
    fs.unlinkSync(path.join(dir, old.name));
    console.log(`  Removed old backup: ${old.name}`);
  }
}

// ─── fetch all rows from a table (paginated) ───────────────────────────────

async function fetchTable(supabase, tableName, orderCol) {
  let allRows = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    let query = supabase.from(tableName).select('*').range(from, from + PAGE - 1);
    if (orderCol) query = query.order(orderCol, { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error(`  ❌ Error fetching ${tableName}: ${error.message}`);
      return null;
    }

    allRows = allRows.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }

  return allRows;
}

// ─── back up one instance ───────────────────────────────────────────────────

async function backupInstance(label, url, key, tables, ts) {
  console.log(`\n── ${label} ──`);
  const supabase = createClient(url, key);

  for (const { name, orderCol } of tables) {
    process.stdout.write(`  Fetching ${name}... `);
    const rows = await fetchTable(supabase, name, orderCol);

    if (rows === null) {
      console.log('skipped (error)');
      continue;
    }

    console.log(`${rows.length} rows`);

    const prefix = `${label.toLowerCase().replace(/\s+/g, '-')}-${name}`;
    const jsonFile = path.join(BACKUP_DIR, `${prefix}-${ts}.json`);
    const csvFile  = path.join(BACKUP_DIR, `${prefix}-${ts}.csv`);

    fs.writeFileSync(jsonFile, JSON.stringify(rows, null, 2), 'utf8');
    fs.writeFileSync(csvFile, toCSV(rows), 'utf8');
    console.log(`  ✓ ${path.basename(jsonFile)}`);
    console.log(`  ✓ ${path.basename(csvFile)}`);

    pruneOldBackups(BACKUP_DIR, `${prefix}-`, MAX_BACKUPS * 2);
  }
}

// ─── schema backup ─────────────────────────────────────────────────────────

function backupSchema() {
  // All SQL files in order: base tables first, then migrations
  const schemaFiles = [
    'supabase-schema.sql',            // events table (frontend)
    'create-places-table.sql',        // places table (frontend)
    'create-places-directory.sql',    // places_directory table (frontend)
    'create-user-tokens-table.sql',   // user_tokens table (backend)
    'add-calendar-event-id-column.sql',
    'add-location2-3-columns.sql',
    'add-feedback-ratings-columns.sql',
    'rename-wineman-to-weinman.sql',
  ];

  const root = __dirname;
  let combined = `-- PhotoEvents Full Schema Backup\n-- Generated: ${new Date().toLocaleString()}\n-- Apply in order to recreate both Supabase instances from scratch.\n\n`;

  for (const file of schemaFiles) {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠ Missing schema file: ${file} (skipped)`);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf8').trim();
    combined += `-- ════════════════════════════════════════\n-- ${file}\n-- ════════════════════════════════════════\n\n${sql}\n\n`;
  }

  const outFile = path.join(BACKUP_DIR, 'schema-backup.sql');
  fs.writeFileSync(outFile, combined, 'utf8');
  console.log(`  ✓ schema-backup.sql (${schemaFiles.length} files merged)`);
}

// ─── main ──────────────────────────────────────────────────────────────────

async function run() {
  console.log('=== Supabase Full Backup ===');
  console.log(`Time: ${new Date().toLocaleString()}`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
    console.log(`Created folder: ${BACKUP_DIR}`);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  await backupInstance('frontend', FRONTEND_URL, FRONTEND_KEY, [
    { name: 'events',            orderCol: 'event_date' },
    { name: 'places',            orderCol: 'name' },
    { name: 'places_directory',  orderCol: 'name' },
  ], ts);

  await backupInstance('backend', BACKEND_URL, BACKEND_KEY, [
    { name: 'user_tokens', orderCol: null },
  ], ts);

  console.log('\n── schema ──');
  backupSchema();

  console.log('\n=== Done ===');
  console.log(`Backup folder: ${BACKUP_DIR}`);
}

run().catch((err) => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
