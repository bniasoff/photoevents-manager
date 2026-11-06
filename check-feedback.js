const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wkdjsvciamugtiidqafa.supabase.co',
  'sb_publishable_VhNtFhqmUJxE2Lxxyl9GmA_FW7hMbA4'
);

async function checkFeedback() {
  try {
    console.log('📊 Checking events with feedback in database...\n');

    const { data: events, error } = await supabase
      .from('events')
      .select('id, name, phone, feedback, event_date')
      .not('feedback', 'is', null)
      .order('name');

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`✓ Found ${events.length} events with feedback\n`);
    console.log('='.repeat(80));

    // Group by name to see duplicates
    const byName = {};
    events.forEach(event => {
      if (!byName[event.name]) {
        byName[event.name] = [];
      }
      byName[event.name].push(event);
    });

    console.log('Events with feedback (grouped by name):\n');

    Object.keys(byName).sort().forEach(name => {
      const eventList = byName[name];
      console.log(`📝 ${name} (${eventList.length} record${eventList.length > 1 ? 's' : ''})`);

      eventList.forEach((event, idx) => {
        const eventDate = event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date';
        const feedbackPreview = event.feedback.length > 60
          ? event.feedback.substring(0, 60) + '...'
          : event.feedback;
        console.log(`   ${idx + 1}. ${eventDate} - Phone: ${event.phone || 'None'}`);
        console.log(`      Feedback: "${feedbackPreview}"`);
      });
      console.log('');
    });

    console.log('='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Total records with feedback: ${events.length}`);
    console.log(`   Unique event names: ${Object.keys(byName).length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkFeedback();
