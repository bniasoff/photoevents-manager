const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkAndResetTokens() {
  const userId = 'default-user';

  console.log('\n🔍 Checking tokens for user:', userId);
  console.log('================================\n');

  try {
    // Check current tokens
    const { data, error } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ No tokens found in database');
        return;
      }
      throw error;
    }

    console.log('📊 Current Token Status:');
    console.log('  - User ID:', data.user_id);
    console.log('  - Has Access Token:', !!data.access_token);
    console.log('  - Has Refresh Token:', !!data.refresh_token);
    console.log('  - Expires At:', data.expires_at ? new Date(data.expires_at).toISOString() : 'Unknown');

    const now = Date.now();
    const expired = data.expires_at ? now > data.expires_at : false;
    console.log('  - Token Expired:', expired);

    if (data.expires_at) {
      const timeUntilExpiry = Math.floor((data.expires_at - now) / 1000 / 60);
      console.log('  - Time Until Expiry:', timeUntilExpiry, 'minutes');
    }

    console.log('\n🔍 Diagnosis:');
    if (!data.refresh_token) {
      console.log('❌ PROBLEM: No refresh token stored!');
      console.log('   This means you authorized the app before the refresh token fix was deployed.');
      console.log('   When the access token expires, you\'ll have to sign in again.');
      console.log('\n💡 SOLUTION: Delete these tokens and re-authenticate to get a refresh token.');

      // Ask if they want to delete
      console.log('\n⚠️  Would you like to delete these tokens? (You\'ll need to sign in again)');
      console.log('   Run this script with --delete flag to delete:');
      console.log('   node check-and-reset-tokens.js --delete');
    } else {
      console.log('✅ Refresh token present! Auto-refresh should work.');
      if (expired) {
        console.log('   Access token is expired, but it should auto-refresh on next use.');
      } else {
        console.log('   Everything looks good!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function deleteTokens() {
  const userId = 'default-user';

  console.log('\n🗑️  Deleting tokens for user:', userId);
  console.log('================================\n');

  try {
    const { error } = await supabase
      .from('user_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    console.log('✅ Tokens deleted successfully!');
    console.log('\n📱 Next Steps:');
    console.log('   1. Open your app');
    console.log('   2. Try to export an event to Google Calendar');
    console.log('   3. You\'ll be prompted to sign in');
    console.log('   4. After signing in, the app will automatically get a refresh token');
    console.log('   5. You won\'t have to sign in again after that!\n');

  } catch (error) {
    console.error('❌ Error deleting tokens:', error.message);
  }
}

// Check command line arguments
if (process.argv.includes('--delete')) {
  deleteTokens();
} else {
  checkAndResetTokens();
}
