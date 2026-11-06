const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// SQL Server connection configuration
// Try multiple connection methods
const configs = [
  // Method 1: Named instance with Windows Auth
  {
    server: 'Niasoff-Desktop1',
    database: 'CalendarEvents',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      instanceName: 'SQLSERVER2022',
      integratedSecurity: true,
    },
  },
  // Method 2: localhost with instance
  {
    server: 'localhost\\SQLSERVER2022',
    database: 'CalendarEvents',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      integratedSecurity: true,
    },
  },
  // Method 3: Direct server name
  {
    server: 'Niasoff-Desktop1\\SQLSERVER2022',
    database: 'CalendarEvents',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      integratedSecurity: true,
    },
  },
];

const config = configs[0]; // Try first config

/**
 * Convert rows to CSV string
 */
function rowsToCSV(rows) {
  if (!rows || rows.length === 0) {
    return '';
  }

  // Get headers from first row keys
  const headers = Object.keys(rows[0]);

  // Create CSV header row
  let csv = headers.join(',') + '\n';

  // Add data rows
  rows.forEach(row => {
    const values = headers.map(header => {
      let value = row[header];

      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Handle dates
      if (value instanceof Date) {
        value = value.toISOString();
      }

      // Convert to string
      value = String(value);

      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }

      return value;
    });

    csv += values.join(',') + '\n';
  });

  return csv;
}

/**
 * Export SQL Server table to CSV
 */
async function exportToCSV() {
  let pool;

  try {
    console.log('Connecting to SQL Server...');
    console.log('Server:', config.server);
    console.log('Database:', config.database);
    console.log('Authentication: Windows Authentication');
    console.log('');

    // Connect to SQL Server
    pool = await sql.connect(config);

    console.log('✓ Connected successfully!');
    console.log('');

    // Query the events table
    console.log('Querying events table...');
    const result = await pool.request().query('SELECT * FROM events');

    const rows = result.recordset;
    console.log(`✓ Retrieved ${rows.length} records`);
    console.log('');

    // Show column information
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      console.log(`Columns found (${columns.length} total):`);
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col}`);
      });
      console.log('');
    }

    // Convert to CSV
    console.log('Converting to CSV format...');
    const csvContent = rowsToCSV(rows);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `sql-events-export-${timestamp}.csv`;
    const filepath = path.join(__dirname, filename);

    // Write to file
    console.log(`Writing to file: ${filename}`);
    fs.writeFileSync(filepath, csvContent, 'utf8');

    console.log('');
    console.log('✓ Export complete!');
    console.log(`✓ File saved to: ${filepath}`);
    console.log(`✓ Total records: ${rows.length}`);

    // Display sample of first few records
    if (rows.length > 0) {
      console.log('\nSample data (first 3 records):');
      rows.slice(0, 3).forEach((row, index) => {
        console.log(`\n${index + 1}. Record ID: ${row.id || row.ID || row._id || '(no id)'}`);
        // Show first few columns
        const cols = Object.keys(row).slice(0, 5);
        cols.forEach(col => {
          let value = row[col];
          if (value instanceof Date) {
            value = value.toISOString();
          }
          console.log(`   ${col}: ${value}`);
        });
      });
    }

  } catch (error) {
    console.error('\n❌ Error exporting from SQL Server:');

    if (error.code === 'ESOCKET') {
      console.error('Connection Error: Could not connect to SQL Server');
      console.error('Please check:');
      console.error('  1. SQL Server is running');
      console.error('  2. Server name is correct:', config.server);
      console.error('  3. TCP/IP is enabled in SQL Server Configuration Manager');
      console.error('  4. Windows Firewall allows SQL Server connections');
    } else if (error.code === 'ELOGIN') {
      console.error('Authentication Error: Login failed');
      console.error('Please check:');
      console.error('  1. Windows Authentication is enabled');
      console.error('  2. Your Windows account has access to the database');
    } else if (error.message && error.message.includes('Invalid object name')) {
      console.error('Table Error: The "events" table was not found');
      console.error('Please check:');
      console.error('  1. The table name is correct (case-sensitive)');
      console.error('  2. The table exists in the CalendarEvents database');
    } else {
      console.error('Error:', error.message);
    }

    process.exit(1);
  } finally {
    // Close connection
    if (pool) {
      await pool.close();
    }
  }
}

// Run the export
console.log('=== SQL Server Events Export ===\n');
exportToCSV();
