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

    // Calculate token expiration timestamp
    const expiresAt = Date.now() + (tokens.expiry_date || 3600 * 1000);

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
      console.error('Error storing tokens:', error);
      throw error;
    }

    console.log(`Tokens stored for user: ${userId}`);

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
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking auth status:', error);
    }

    res.json({ authenticated: !!data });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.json({ authenticated: false });
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
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Reconstruct tokens object for googleapis
    const tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expires_at
    };

    // Set credentials
    oauth2Client.setCredentials(tokens);

    // Set up token refresh handler - automatically saves refreshed tokens
    oauth2Client.on('tokens', async (newTokens) => {
      console.log('Token refreshed automatically');

      // Update tokens in Supabase with new access token
      const updatedTokens = {
        user_id: userId,
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || tokenData.refresh_token, // Keep existing refresh token if not provided
        expires_at: newTokens.expiry_date || (Date.now() + 3600 * 1000),
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('user_tokens')
        .upsert(updatedTokens, { onConflict: 'user_id' });

      console.log('Updated tokens saved to Supabase');
    });

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

    // googleapis will automatically refresh the token if expired before this call
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

  } catch (error) {
    console.error('Error creating calendar event:', error);

    // Check if token refresh failed (no valid refresh token)
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      console.log('Token refresh failed, deleting tokens');
      // Delete expired tokens from Supabase
      await supabase
        .from('user_tokens')
        .delete()
        .eq('user_id', userId);

      return res.status(401).json({ error: 'Token expired, please re-authenticate' });
    }

    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'PhotoEvents Backend Server' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 OAuth callback: http://localhost:${PORT}/oauth2callback`);
});
