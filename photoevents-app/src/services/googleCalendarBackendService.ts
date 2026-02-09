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

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/status?userId=${USER_ID}`);
    const data = await response.json();
    return data.authenticated;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return false;
  }
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
 * Wait for authentication to complete by polling the auth status
 * Returns true if authenticated within timeout, false otherwise
 */
const waitForAuthentication = async (timeoutMs: number = 30000): Promise<boolean> => {
  const startTime = Date.now();
  const pollInterval = 1000; // Check every second

  while (Date.now() - startTime < timeoutMs) {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      console.log('Authentication confirmed!');
      return true;
    }
    console.log('Waiting for authentication to complete...');
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  console.log('Authentication timeout');
  return false;
};

/**
 * Export event to Google Calendar via backend
 * Automatically handles token refresh if authentication expires
 */
export const exportToGoogleCalendar = async (event: Event, isRetry: boolean = false): Promise<boolean> => {
  try {
    console.log('=== EXPORT TO GOOGLE CALENDAR (BACKEND) START ===');

    // Construct ISO datetime from EventDate and Start time
    // Parse the date components to avoid timezone issues
    const dateParts = event.EventDate.split('T')[0].split('-'); // YYYY-MM-DD
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
    const day = parseInt(dateParts[2]);

    let hours = 12; // Default to noon if no start time
    let minutes = 0;

    if (event.Start) {
      const timeParts = event.Start.split(':');
      hours = parseInt(timeParts[0]);
      minutes = parseInt(timeParts[1]);
    }

    const eventDate = new Date(year, month, day, hours, minutes, 0);

    const response = await fetch(`${BACKEND_URL}/calendar/create-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

      // Check if token expired - auto-refresh and retry
      if (response.status === 401 && !isRetry) {
        console.log('Token expired, automatically refreshing authentication...');
        const authSuccess = await authenticateWithGoogle();

        if (authSuccess) {
          console.log('Browser opened for re-authentication. Waiting for completion...');
          // Poll until authentication is complete (with 30 second timeout)
          const authenticated = await waitForAuthentication(30000);

          if (authenticated) {
            console.log('Authentication complete, retrying export...');
            // Retry the export once with isRetry flag to prevent infinite loop
            return await exportToGoogleCalendar(event, true);
          } else {
            console.error('Authentication timeout - please try exporting again');
            return false;
          }
        } else {
          console.error('Failed to open authentication browser');
          return false;
        }
      }

      return false;
    }

    const data = await response.json();
    console.log('Calendar event created:', data.eventId);
    console.log('Event URL:', data.eventUrl);
    console.log('=== EXPORT SUCCESS ===');

    return true;
  } catch (error) {
    console.error('Error exporting to Google Calendar:', error);
    return false;
  }
};
