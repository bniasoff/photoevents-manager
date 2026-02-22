import { Linking } from 'react-native';
import { Event } from '../types/Event';

// Backend server URL - deployed on Vercel
const BACKEND_URL = 'https://photoevents-backend.vercel.app';

const USER_ID = 'mobile-user'; // Simple user ID for now

/**
 * Authenticate with Google via backend
 * Opens browser for OAuth flow
 */
export const authenticateWithGoogle = async (): Promise<boolean> => {
  try {
    console.log('=== BACKEND OAUTH START ===');

    // Get auth URL from backend
    const response = await fetch(`${BACKEND_URL}/auth/google?userId=${USER_ID}`);
    const data = await response.json();

    console.log('Opening browser for authentication...');

    // Open the auth URL in the system browser
    const supported = await Linking.canOpenURL(data.authUrl);
    if (supported) {
      await Linking.openURL(data.authUrl);
      console.log('Browser opened, waiting for user to complete authentication...');
      return true; // User will complete auth in browser
    } else {
      console.error('Cannot open URL');
      return false;
    }
  } catch (error) {
    console.error('Error starting authentication:', error);
    return false;
  }
};

export interface AuthStatus {
  authenticated: boolean;
  hasRefreshToken: boolean;
  tokenExpired: boolean;
  expiresAt: number | null;   // ms since epoch — access token expiry
  signedInAt: string | null;  // ISO timestamp — when user last signed in (refresh token issued)
}

/**
 * Get full auth status including token expiry time
 */
export const getAuthStatus = async (): Promise<AuthStatus> => {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/status?userId=${USER_ID}`);
    const data = await response.json();
    return {
      authenticated: data.authenticated ?? false,
      hasRefreshToken: data.hasRefreshToken ?? false,
      tokenExpired: data.tokenExpired ?? false,
      expiresAt: data.expiresAt ?? null,
      signedInAt: data.signedInAt ?? null,
    };
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { authenticated: false, hasRefreshToken: false, tokenExpired: false, expiresAt: null, signedInAt: null };
  }
};

/**
 * Check if user is authenticated
 * Returns true if the backend has a refresh token (can auto-renew access)
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const status = await getAuthStatus();
  return status.authenticated && status.hasRefreshToken;
};

/**
 * Sign out from Google
 */
export const signOut = async (): Promise<void> => {
  try {
    await fetch(`${BACKEND_URL}/auth/signout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: USER_ID }),
    });
  } catch (error) {
    console.error('Error signing out:', error);
  }
};


/**
 * Export event to Google Calendar via backend.
 * Returns 'success', 'needsReauth' (token expired, user must sign in), or 'failed'.
 */
export const exportToGoogleCalendar = async (event: Event): Promise<'success' | 'needsReauth' | 'failed'> => {
  try {
    console.log('=== EXPORT TO GOOGLE CALENDAR (BACKEND) START ===');

    const dateParts = event.EventDate.split('T')[0].split('-'); // YYYY-MM-DD
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);

    let hours = 12;
    let minutes = 0;

    if (event.Start) {
      const timeParts = event.Start.split(':');
      hours = parseInt(timeParts[0]);
      minutes = parseInt(timeParts[1]);
    }

    const eventDate = new Date(year, month, day, hours, minutes, 0);

    const response = await fetch(`${BACKEND_URL}/calendar/create-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        event: {
          name: event.Name,
          category: event.Category || '',
          location: [event.Place, event.Address].filter(Boolean).join(', '),
          contactName: event.Name,
          phone: event.Phone || '',
          notes: event.Info || '',
          scheduledTime: eventDate.toISOString(),
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to create calendar event:', errorData);

      if (response.status === 401 && errorData.needsReauth) {
        console.log('Token expired/revoked — user must re-authenticate');
        return 'needsReauth';
      }

      return 'failed';
    }

    const data = await response.json();
    console.log('Calendar event created:', data.eventId);
    console.log('=== EXPORT SUCCESS ===');
    return 'success';
  } catch (error) {
    console.error('Error exporting to Google Calendar:', error);
    return 'failed';
  }
};
