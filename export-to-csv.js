const https = require('https');
const fs = require('fs');
const path = require('path');

// API endpoint
const API_URL = 'https://photoevents-server.onrender.com/photoevents';

/**
 * Fetch data from URL using native https module
 */
function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error('Failed to parse JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Convert events array to CSV string
 */
function eventsToCSV(events) {
  if (!events || events.length === 0) {
    return '';
  }

  // Define CSV headers based on Event schema
  const headers = [
    '_id',
    'Name',
    'EventDate',
    'Start',
    'End',
    'Category',
    'Place',
    'Address',
    'Phone',
    'Charge',
    'Payment',
    'Bal',
    'Paid',
    'Ready',
    'Sent',
    'Info',
    'ToDo',
    'Referral',
    'CreatedDate',
    'EtagID',
    'createdAt',
    'updatedAt'
  ];

  // Create CSV header row
  let csv = headers.join(',') + '\n';

  // Add data rows
  events.forEach(event => {
    const row = headers.map(header => {
      let value = event[header] || '';

      // Handle special formatting
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
      } else if (typeof value === 'object') {
        // Convert objects to JSON string
        value = '"' + JSON.stringify(value).replace(/"/g, '""') + '"';
      }

      return value;
    });

    csv += row.join(',') + '\n';
  });

  return csv;
}

/**
 * Fetch events from API and export to CSV
 */
async function exportToCSV() {
  try {
    console.log('Fetching events from API...');
    console.log('URL:', API_URL);

    const events = await fetchData(API_URL);

    console.log(`Successfully fetched ${events.length} events`);

    // Convert to CSV
    console.log('Converting to CSV format...');
    const csvContent = eventsToCSV(events);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `photoevents-export-${timestamp}.csv`;
    const filepath = path.join(__dirname, filename);

    // Write to file
    console.log(`Writing to file: ${filename}`);
    fs.writeFileSync(filepath, csvContent, 'utf8');

    console.log('✓ Export complete!');
    console.log(`✓ File saved to: ${filepath}`);
    console.log(`✓ Total events: ${events.length}`);

    // Display sample of first few events
    if (events.length > 0) {
      console.log('\nSample data (first 3 events):');
      events.slice(0, 3).forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.Name || 'Unnamed'}`);
        console.log(`   Date: ${event.EventDate}`);
        console.log(`   Category: ${event.Category}`);
        console.log(`   Place: ${event.Place}`);
        console.log(`   Paid: ${event.Paid}, Ready: ${event.Ready}, Sent: ${event.Sent}`);
      });
    }

  } catch (error) {
    console.error('Error exporting to CSV:');
    console.error('Error:', error.message);
    if (error.message.includes('HTTP')) {
      console.error('Make sure the API is accessible:', API_URL);
    }
    process.exit(1);
  }
}

// Run the export
console.log('=== Photo Events CSV Export ===\n');
exportToCSV();
