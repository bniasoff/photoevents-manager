import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';
import { Event } from '../types/Event';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '1058945822340-kj4rpp50ks69a39lv2c3uk2ran3cqf8p.apps.googleusercontent.com', // Android OAuth client ID
  offlineAccess: true, // Request refresh token
  scopes: ['https://www.googleapis.com/auth/calendar.events'],
});

const TOKEN_STORAGE_KEY = 'google_calendar_tokens';
const CALENDAR_ID_STORAGE_KEY = 'google_calendar_id';
const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Store tokens securely
 */
const storeTokens = async (tokens: GoogleTokens): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw error;
  }
};

/**
 * Retrieve stored tokens
 */
const getStoredTokens = async (): Promise<GoogleTokens | null> => {
  try {
    const tokensJson = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
    if (!tokensJson) return null;
    return JSON.parse(tokensJson);
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    return null;
  }
};

/**
 * Clear stored tokens
 */
const clearTokens = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    await SecureStore.deleteItemAsync(CALENDAR_ID_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
};

/**
 * Get current access token, refreshing if needed
 */
const getAccessToken = async (): Promise<string> => {
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error('Failed to get access token');
  }
};

/**
 * Authenticate with Google using native sign-in
 */
export const authenticateWithGoogle = async (): Promise<boolean> => {
  try {
    console.log('=== GOOGLE NATIVE SIGN-IN START ===');

    // Check if already signed in
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (isSignedIn) {
      console.log('Already signed in, signing out first...');
      await GoogleSignin.signOut();
    }

    // Prompt user to sign in
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    console.log('Sign-in successful:', userInfo.user.email);

    // Get tokens
    const tokens = await GoogleSignin.getTokens();
    console.log('Got access token:', tokens.accessToken ? 'YES' : 'NO');

    // Store tokens
    const googleTokens: GoogleTokens = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.idToken || '', // Note: Native sign-in handles refresh automatically
      expiresAt: Date.now() + 3600000, // 1 hour
    };
    await storeTokens(googleTokens);

    console.log('=== GOOGLE NATIVE SIGN-IN SUCCESS ===');
    return true;
  } catch (error: any) {
    console.error('Error during native Google sign-in:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return false;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    return await GoogleSignin.isSignedIn();
  } catch (error) {
    return false;
  }
};

/**
 * Sign out from Google
 */
export const signOut = async (): Promise<void> => {
  try {
    await GoogleSignin.signOut();
    await clearTokens();
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

/**
 * Store selected calendar ID
 */
export const storeCalendarId = async (calendarId: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(CALENDAR_ID_STORAGE_KEY, calendarId);
  } catch (error) {
    console.error('Error storing calendar ID:', error);
    throw error;
  }
};

/**
 * Get stored calendar ID
 */
export const getStoredCalendarId = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(CALENDAR_ID_STORAGE_KEY);
  } catch (error) {
    console.error('Error retrieving calendar ID:', error);
    return null;
  }
};

/**
 * Fetch user's calendars
 */
export const fetchCalendars = async (): Promise<any[]> => {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${CALENDAR_API_URL}/users/me/calendarList`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch calendars');
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching calendars:', error);
    throw error;
  }
};

/**
 * Find "Photography Event" calendar or return primary
 */
export const findPhotographyCalendar = async (): Promise<string> => {
  try {
    const calendars = await fetchCalendars();

    // Look for "Photography Event" calendar
    const photoCalendar = calendars.find((cal: any) =>
      cal.summary?.toLowerCase().includes('photography event')
    );

    if (photoCalendar) {
      console.log('Found Photography Event calendar:', photoCalendar.id);
      await storeCalendarId(photoCalendar.id);
      return photoCalendar.id;
    }

    // Fallback to primary calendar
    console.log('Using primary calendar');
    const primary = calendars.find((cal: any) => cal.primary);
    const calendarId = primary?.id || 'primary';
    await storeCalendarId(calendarId);
    return calendarId;
  } catch (error) {
    console.error('Error finding calendar:', error);
    return 'primary';
  }
};

/**
 * Export event to Google Calendar
 */
export const exportToGoogleCalendar = async (event: Event): Promise<boolean> => {
  try {
    console.log('=== EXPORT TO GOOGLE CALENDAR START ===');

    // Get access token
    const accessToken = await getAccessToken();

    // Get or find calendar ID
    let calendarId = await getStoredCalendarId();
    if (!calendarId) {
      calendarId = await findPhotographyCalendar();
    }

    console.log('Using calendar ID:', calendarId);

    // Format event data
    const calendarEvent = {
      summary: event.name,
      location: event.location || '',
      description: `Contact: ${event.contactName}\nPhone: ${event.phone}\n\nNotes: ${event.notes || 'None'}`,
      start: {
        dateTime: new Date(event.scheduledTime).toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: new Date(new Date(event.scheduledTime).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        timeZone: 'America/New_York',
      },
    };

    console.log('Creating calendar event...');

    // Create event in Google Calendar
    const response = await fetch(
      `${CALENDAR_API_URL}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to create calendar event:', errorData);
      throw new Error('Failed to create calendar event');
    }

    const createdEvent = await response.json();
    console.log('Calendar event created successfully:', createdEvent.id);
    console.log('=== EXPORT TO GOOGLE CALENDAR SUCCESS ===');

    return true;
  } catch (error) {
    console.error('Error exporting to Google Calendar:', error);
    return false;
  }
};
