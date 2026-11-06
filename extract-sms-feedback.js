const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with credentials from photoevents-app
const supabase = createClient(
  'https://wkdjsvciamugtiidqafa.supabase.co',
  'sb_publishable_VhNtFhqmUJxE2Lxxyl9GmA_FW7hMbA4'
);

// Normalize phone number to just digits
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, ''); // Remove all non-digit characters
}

// Check if a message looks like feedback (positive/negative words, mentions service quality, etc.)
function isFeedback(message) {
  const feedbackKeywords = [
    'thank', 'thanks', 'great', 'amazing', 'excellent', 'perfect', 'beautiful',
    'loved', 'love', 'wonderful', 'fantastic', 'awesome', 'professional',
    'recommend', 'happy', 'pleased', 'satisfied', 'good job', 'well done',
    'appreciate', 'best', 'outstanding', 'impressed', 'gorgeous', 'stunning',
    'photo', 'picture', 'video', 'album', 'quality', 'work',
    // Negative feedback
    'disappointed', 'unhappy', 'problem', 'issue', 'complaint', 'bad', 'poor',
    'late', 'missing', 'wrong', 'not happy', 'upset', 'angry'
  ];

  const lowerMsg = message.toLowerCase();
  return feedbackKeywords.some(keyword => lowerMsg.includes(keyword));
}

async function extractFeedback() {
  try {
    console.log('📊 Fetching events from Supabase...');

    // Fetch all events with phone numbers
    const { data: events, error } = await supabase
      .from('events')
      .select('id, name, phone, feedback')
      .not('phone', 'is', null)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching events:', error);
      return;
    }

    console.log(`✓ Found ${events.length} events with phone numbers`);

    // Create phone number to event mapping
    const phoneMap = new Map();
    events.forEach(event => {
      const normalized = normalizePhone(event.phone);
      if (normalized) {
        if (!phoneMap.has(normalized)) {
          phoneMap.set(normalized, []);
        }
        phoneMap.set(normalized, [...phoneMap.get(normalized), event]);
      }
    });

    console.log(`✓ Processing ${phoneMap.size} unique phone numbers`);
    console.log('\n📱 Reading SMS file (this may take a while for a 657MB file)...');

    const xmlPath = 'c:\\Projects\\AI\\Phtotevents4\\XML\\sms-20250907005854.xml';

    // Read file in chunks to avoid memory issues
    const stream = fs.createReadStream(xmlPath, { encoding: 'utf8' });

    let buffer = '';
    let messagesFound = 0;
    let feedbackMatches = [];

    stream.on('data', (chunk) => {
      buffer += chunk;

      // Process complete SMS entries
      const smsRegex = /<sms[^>]+\/>/g;
      let match;

      while ((match = smsRegex.exec(buffer)) !== null) {
        const smsTag = match[0];

        // Extract attributes
        const addressMatch = smsTag.match(/address="([^"]+)"/);
        const bodyMatch = smsTag.match(/body="([^"]+)"/);
        const typeMatch = smsTag.match(/type="(\d+)"/);
        const dateMatch = smsTag.match(/readable_date="([^"]+)"/);

        if (addressMatch && bodyMatch && typeMatch) {
          const address = normalizePhone(addressMatch[1]);
          const body = bodyMatch[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
          const type = typeMatch[1];
          const date = dateMatch ? dateMatch[1] : '';

          // Type "1" = received message from contact
          if (type === '1' && phoneMap.has(address)) {
            messagesFound++;

            // Include ALL messages (no filtering)
            const matchingEvents = phoneMap.get(address);
            matchingEvents.forEach(event => {
              feedbackMatches.push({
                eventId: event.id,
                eventName: event.name,
                phone: event.phone,
                existingFeedback: event.feedback,
                newFeedback: body,
                date: date
              });
            });
          }
        }
      }

      // Keep last incomplete line in buffer
      const lastNewline = buffer.lastIndexOf('\n');
      if (lastNewline !== -1) {
        buffer = buffer.substring(lastNewline + 1);
      }
    });

    stream.on('end', async () => {
      console.log(`\n✓ Finished reading SMS file`);
      console.log(`📝 Found ${messagesFound} messages from your contacts`);
      console.log(`💬 Found ${feedbackMatches.length} messages that look like feedback\n`);

      if (feedbackMatches.length === 0) {
        console.log('No feedback messages found to import.');
        return;
      }

      // Display matches and ask for confirmation
      console.log('='.repeat(80));
      console.log('FEEDBACK MATCHES FOUND:\n');

      feedbackMatches.slice(0, 20).forEach((match, idx) => {
        console.log(`${idx + 1}. Event: ${match.eventName}`);
        console.log(`   Phone: ${match.phone}`);
        console.log(`   Date: ${match.date}`);
        console.log(`   Message: "${match.newFeedback}"`);
        if (match.existingFeedback) {
          console.log(`   ⚠️  Already has feedback: "${match.existingFeedback}"`);
        }
        console.log('');
      });

      if (feedbackMatches.length > 20) {
        console.log(`... and ${feedbackMatches.length - 20} more matches\n`);
      }

      console.log('='.repeat(80));
      console.log('\n📝 Combining and importing feedback to database...\n');

      // First, clear all existing feedback to start fresh
      console.log('Clearing existing feedback...');
      await supabase
        .from('events')
        .update({ feedback: null })
        .not('feedback', 'is', null);

      // Group messages by event ID and combine them
      const eventFeedbackMap = new Map();

      feedbackMatches.forEach(match => {
        if (!eventFeedbackMap.has(match.eventId)) {
          eventFeedbackMap.set(match.eventId, {
            eventId: match.eventId,
            eventName: match.eventName,
            messages: []
          });
        }
        eventFeedbackMap.get(match.eventId).messages.push({
          date: match.date,
          text: match.newFeedback
        });
      });

      console.log(`✓ Grouped into ${eventFeedbackMap.size} unique events\n`);

      // UPDATE THE DATABASE with combined feedback
      let updated = 0;

      for (const [eventId, data] of eventFeedbackMap) {
        // Sort messages by date and combine
        const sortedMessages = data.messages.sort((a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Combine messages with date stamps
        const combinedFeedback = sortedMessages
          .map(msg => `[${msg.date}] ${msg.text}`)
          .join('\n\n');

        const { error } = await supabase
          .from('events')
          .update({ feedback: combinedFeedback })
          .eq('id', eventId);

        if (error) {
          console.error(`❌ Error updating ${data.eventName}:`, error);
        } else {
          updated++;
          const msgCount = sortedMessages.length;
          console.log(`✓ Updated: ${data.eventName} (${msgCount} message${msgCount > 1 ? 's' : ''})`);
        }
      }

      console.log(`\n✅ Done! Updated ${updated} unique events with combined feedback.`);
    });

    stream.on('error', (err) => {
      console.error('❌ Error reading SMS file:', err);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
extractFeedback();
