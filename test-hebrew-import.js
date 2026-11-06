const fs = require('fs');

// Parse ICS file content and extract events
const parseICSFile = (icsContent) => {
  const events = [];
  const lines = icsContent.split(/\r\n|\n|\r/);

  let currentEvent = null;
  let isInEvent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      isInEvent = true;
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.date && currentEvent.title) {
        events.push(currentEvent);
      }
      currentEvent = null;
      isInEvent = false;
      continue;
    }

    if (!isInEvent || !currentEvent) continue;

    // Parse DTSTART (date)
    if (line.startsWith('DTSTART')) {
      const dateMatch = line.match(/DTSTART[;:].*?(\d{8})/);
      if (dateMatch) {
        const dateStr = dateMatch[1]; // YYYYMMDD
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        currentEvent.date = `${year}-${month}-${day}`;
      }
    }

    // Parse SUMMARY (title)
    if (line.startsWith('SUMMARY:')) {
      currentEvent.title = line.substring(8).trim();
    }

    // Parse DESCRIPTION
    if (line.startsWith('DESCRIPTION:')) {
      currentEvent.description = line.substring(12).trim();
    }
  }

  return events;
};

// Read and parse the ICS file
const icsContent = fs.readFileSync('calendar/jewish-holidays.ics', 'utf-8');
const hebrewDates = parseICSFile(icsContent);

console.log('\n📅 Hebrew Calendar Import Test\n');
console.log(`✅ Successfully parsed ${hebrewDates.length} Hebrew dates\n`);

// Group by year
const byYear = {};
hebrewDates.forEach(date => {
  const year = date.date.substring(0, 4);
  if (!byYear[year]) byYear[year] = [];
  byYear[year].push(date);
});

// Show summary by year
console.log('📊 Summary by Year:');
Object.keys(byYear).sort().forEach(year => {
  console.log(`   ${year}: ${byYear[year].length} holidays`);
});

// Show first 10 holidays
console.log('\n🎉 First 10 Holidays:');
hebrewDates.slice(0, 10).forEach(date => {
  console.log(`   ${date.date}: ${date.title}`);
});

// Show last 10 holidays
console.log('\n🎉 Last 10 Holidays:');
hebrewDates.slice(-10).forEach(date => {
  console.log(`   ${date.date}: ${date.title}`);
});

console.log('\n✅ Ready to import into the app!\n');
