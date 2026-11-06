import type { Event } from '../types/Event';

// Same deployed backend the mobile app uses for Calendar OAuth/export — the local
// dev backend's OAuth redirect URI is configured for this URL, not localhost, and
// both read/write the same backend Supabase token store either way.
const BACKEND_URL = 'https://photoevents-backend.vercel.app';
const USER_ID = 'mobile-user'; // shared with the mobile app — one Google connection for both

export interface AuthStatus {
  authenticated: boolean;
  hasRefreshToken: boolean;
  tokenExpired: boolean;
  expiresAt: number | null;
  signedInAt: string | null;
}

export const getAuthStatus = async (): Promise<AuthStatus> => {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/status?userId=${USER_ID}`);
    const data = await res.json();
    return {
      authenticated: data.authenticated ?? false,
      hasRefreshToken: data.hasRefreshToken ?? false,
      tokenExpired: data.tokenExpired ?? false,
      expiresAt: data.expiresAt ?? null,
      signedInAt: data.signedInAt ?? null,
    };
  } catch {
    return { authenticated: false, hasRefreshToken: false, tokenExpired: false, expiresAt: null, signedInAt: null };
  }
};

export const startGoogleAuth = async (): Promise<void> => {
  const res = await fetch(`${BACKEND_URL}/auth/google?userId=${USER_ID}`);
  const data = await res.json();
  window.open(data.authUrl, '_blank', 'noopener,noreferrer');
};

export const signOutGoogle = async (): Promise<void> => {
  await fetch(`${BACKEND_URL}/auth/signout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: USER_ID }),
  });
};

export interface ExportResult {
  result: 'success' | 'needsReauth' | 'failed';
  calendarEventId?: string;
  deleteWarning?: string | null; // set if replacing a prior export and the old entry failed to delete
}

export const exportToGoogleCalendar = async (
  event: Event,
  existingCalendarEventId?: string
): Promise<ExportResult> => {
  try {
    const dateParts = event.EventDate.split('T')[0].split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);
    let hours = 12;
    let minutes = 0;
    if (event.Start) {
      const [h, m] = event.Start.split(':');
      hours = parseInt(h);
      minutes = parseInt(m);
    }
    const eventDate = new Date(year, month, day, hours, minutes, 0);

    // The backend defaults to a 2-hour event when no end time is given, so the actual
    // end time must be sent explicitly — otherwise every export came out 2 hours long
    // regardless of the real duration. Rolls to the next day for an overnight event
    // (e.g. 8:45 PM – 12:15 AM), matching the duration math used elsewhere in the app.
    let scheduledEndTime: string | undefined;
    if (event.End) {
      const [endHour, endMinute] = event.End.split(':').map((v) => parseInt(v));
      let endDate = new Date(year, month, day, endHour, endMinute, 0);
      if (endDate.getTime() < eventDate.getTime()) {
        endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
      }
      scheduledEndTime = endDate.toISOString();
    }

    const res = await fetch(`${BACKEND_URL}/calendar/create-event`, {
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
          scheduledEndTime: scheduledEndTime || null,
          existingEventId: existingCalendarEventId || null,
        },
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (res.status === 401 && errorData.needsReauth) return { result: 'needsReauth' };
      return { result: 'failed' };
    }
    const data = await res.json();
    return { result: 'success', calendarEventId: data.eventId, deleteWarning: data.deleteWarning ?? null };
  } catch {
    return { result: 'failed' };
  }
};
