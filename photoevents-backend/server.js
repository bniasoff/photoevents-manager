const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Google OAuth2 Configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
);

// Supabase client for persistent token storage
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Generate auth URL for user to authenticate
app.get('/auth/google', (req, res) => {
  const userId = req.query.userId || 'default-user';

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent',
    state: userId, // Pass userId through state parameter
  });

  res.json({ authUrl });
});

// OAuth2 callback - receives authorization code from Google
app.get('/oauth2callback', async (req, res) => {
  const { code, state } = req.query;
  const userId = state || 'default-user';

  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    console.log('📝 OAuth tokens received:');
    console.log('  - Access token:', !!tokens.access_token);
    console.log('  - Refresh token:', !!tokens.refresh_token);
    console.log('  - Expires in:', tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000 / 60) + ' minutes' : 'unknown');

    if (!tokens.refresh_token) {
      console.warn('⚠️  WARNING: No refresh token received! User may have previously authorized the app.');
    }

    // tokens.expiry_date from Google is already an absolute timestamp (ms since epoch)
    const expiresAt = tokens.expiry_date || (Date.now() + 3600 * 1000);

    // Store tokens in Supabase
    const { error } = await supabase
      .from('user_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('❌ Error storing tokens:', error);
      throw error;
    }

    console.log(`✅ Tokens stored for user: ${userId}`);

    // Redirect to success page or close window
    res.send(`
      <html>
        <body>
          <h1>✅ Authentication Successful!</h1>
          <p>You can close this window and return to the app.</p>
          <script>
            // Try to close the window
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>❌ Authentication Failed</h1>
          <p>Error: ${error.message}</p>
          <pre>${JSON.stringify(error, null, 2)}</pre>
        </body>
      </html>
    `);
  }
});

// Check if user is authenticated
app.get('/auth/status', async (req, res) => {
  const userId = req.query.userId || 'default-user';

  try {
    const { data, error } = await supabase
      .from('user_tokens')
      .select('user_id, access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking auth status:', error);
    }

    const hasTokens = !!data;
    const hasRefreshToken = !!(data && data.refresh_token);
    const tokenExpired = data && data.expires_at ? Date.now() > data.expires_at : false;

    console.log(`Auth status for ${userId}: authenticated=${hasTokens}, hasRefreshToken=${hasRefreshToken}, tokenExpired=${tokenExpired}`);

    res.json({
      authenticated: hasTokens,
      hasRefreshToken: hasRefreshToken,
      tokenExpired: tokenExpired
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.json({ authenticated: false, hasRefreshToken: false });
  }
});

// Sign out - clear tokens
app.post('/auth/signout', async (req, res) => {
  const userId = req.body.userId || 'default-user';

  try {
    await supabase
      .from('user_tokens')
      .delete()
      .eq('user_id', userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error signing out:', error);
    res.json({ success: false, error: error.message });
  }
});

// Create calendar event
app.post('/calendar/create-event', async (req, res) => {
  const userId = req.body.userId || 'default-user';
  const eventData = req.body.event;

  try {
    // Get stored tokens from Supabase
    const { data: tokenData, error: fetchError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !tokenData) {
      console.log(`❌ No tokens found for user: ${userId}`);
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log(`📥 Retrieved tokens for user: ${userId}`);
    console.log('  - Has access token:', !!tokenData.access_token);
    console.log('  - Has refresh token:', !!tokenData.refresh_token);
    const timeUntilExpiry = tokenData.expires_at ? Math.floor((tokenData.expires_at - Date.now()) / 1000 / 60) : null;
    console.log('  - Token expires in:', timeUntilExpiry !== null ? timeUntilExpiry + ' minutes' : 'unknown');

    if (!tokenData.refresh_token) {
      console.warn('⚠️  WARNING: No refresh token stored! User will need to re-authenticate when access token expires.');
    }

    if (timeUntilExpiry !== null && timeUntilExpiry < 5) {
      console.log('🔄 Token will expire soon, googleapis will auto-refresh');
    }

    // Reconstruct tokens object for googleapis
    const tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expires_at
    };

    // Set credentials
    oauth2Client.setCredentials(tokens);

    // Helper to save refreshed tokens to Supabase
    const saveRefreshedTokens = async (newTokens) => {
      const updatedTokens = {
        user_id: userId,
        access_token: newTokens.access_token || tokenData.access_token,
        refresh_token: newTokens.refresh_token || tokenData.refresh_token,
        expires_at: newTokens.expiry_date || (Date.now() + 3600 * 1000),
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('user_tokens')
        .upsert(updatedTokens, { onConflict: 'user_id' });

      if (updateError) {
        console.error('❌ Error saving refreshed tokens:', updateError);
      } else {
        console.log('✅ Refreshed tokens saved to Supabase');
      }
    };

    // Listen for auto-refresh (use removeAllListeners to avoid stacking handlers)
    oauth2Client.removeAllListeners('tokens');
    oauth2Client.on('tokens', async (newTokens) => {
      console.log('🔄 Auto token refresh triggered');
      await saveRefreshedTokens(newTokens);
    });

    // If the access token is expired but we have a refresh token, proactively refresh
    const tokenExpired = tokenData.expires_at && Date.now() > tokenData.expires_at;
    if (tokenExpired && tokenData.refresh_token) {
      console.log('🔄 Access token expired, proactively refreshing...');
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        await saveRefreshedTokens(credentials);
        console.log('✅ Token refreshed successfully');
      } catch (refreshError) {
        console.error('❌ Proactive token refresh failed:', refreshError.message);
        if (refreshError.message === 'invalid_grant') {
          console.log('🔑 Refresh token revoked (invalid_grant), clearing tokens...');
          await supabase.from('user_tokens').delete().eq('user_id', userId);
          return res.status(401).json({ error: 'Token expired, please re-authenticate', needsReauth: true });
        }
        // Don't delete tokens yet - fall through and let the API call try
      }
    }

    // Create calendar service
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Use Photography Event calendar
    const calendarId = '3dc3debda4eb8d023e70ae94e7043de683c6af12080c8a7515bd4e2101625b4c@group.calendar.google.com';
    console.log('Using Photography Event calendar');

    // Create the event
    const event = {
      summary: eventData.name,
      location: eventData.location || '',
      description: `Event Type: ${eventData.category || 'Not specified'}\nContact: ${eventData.contactName}\nPhone: ${eventData.phone}\n\nNotes: ${eventData.notes || 'None'}`,
      start: {
        dateTime: eventData.scheduledTime,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: new Date(new Date(eventData.scheduledTime).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        timeZone: 'America/New_York',
      },
    };

    // Try to create the event - googleapis will auto-refresh if needed
    try {
      const response = await calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });

      console.log('Event created:', response.data.id);

      res.json({
        success: true,
        eventId: response.data.id,
        eventUrl: response.data.htmlLink,
      });
    } catch (apiError) {
      // If 401, try one explicit refresh + retry before giving up
      if ((apiError.code === 401 || apiError.status === 401) && tokenData.refresh_token) {
        console.log('🔄 API returned 401, attempting explicit token refresh...');
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          oauth2Client.setCredentials(credentials);
          await saveRefreshedTokens(credentials);
          console.log('✅ Token refreshed, retrying calendar insert...');

          const retryResponse = await calendar.events.insert({
            calendarId: calendarId,
            resource: event,
          });

          console.log('Event created on retry:', retryResponse.data.id);
          return res.json({
            success: true,
            eventId: retryResponse.data.id,
            eventUrl: retryResponse.data.htmlLink,
          });
        } catch (retryError) {
          console.error('❌ Retry after refresh failed:', retryError.message);
          // Refresh token is likely revoked - delete tokens so user re-auths
          await supabase.from('user_tokens').delete().eq('user_id', userId);
          return res.status(401).json({ error: 'Token expired, please re-authenticate', needsReauth: true });
        }
      }

      // No refresh token or non-401 error
      if (apiError.code === 401 || apiError.status === 401) {
        await supabase.from('user_tokens').delete().eq('user_id', userId);
        return res.status(401).json({ error: 'Token expired, please re-authenticate', needsReauth: true });
      }

      // invalid_grant means refresh token is revoked (Google returns 400, not 401)
      if (apiError.message === 'invalid_grant') {
        console.log('🔑 Refresh token revoked (invalid_grant), clearing tokens...');
        await supabase.from('user_tokens').delete().eq('user_id', userId);
        return res.status(401).json({ error: 'Token expired, please re-authenticate', needsReauth: true });
      }

      throw apiError;
    }

  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'PhotoEvents Backend Server' });
});

// Debug endpoint - check all tokens in database
app.get('/debug/tokens', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_tokens')
      .select('user_id, access_token, refresh_token, expires_at, updated_at');

    if (error) {
      return res.json({
        error: error.message,
        code: error.code,
        hint: 'Make sure user_tokens table exists in Supabase'
      });
    }

    // Mask tokens for security
    const maskedData = data.map(row => ({
      user_id: row.user_id,
      has_access_token: !!row.access_token,
      has_refresh_token: !!row.refresh_token,
      access_token_preview: row.access_token ? row.access_token.substring(0, 20) + '...' : null,
      expires_at: row.expires_at,
      expired: row.expires_at ? Date.now() > row.expires_at : null,
      updated_at: row.updated_at
    }));

    res.json({
      count: data.length,
      tokens: maskedData
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 OAuth callback: http://localhost:${PORT}/oauth2callback`);
});
