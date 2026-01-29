import { Event, EventStatus, EventCategory } from '../types/Event';

/**
 * Get event ID (supports both Xata 'id' and MongoDB '_id' formats)
 */
export const getEventId = (event: Event): string => {
  return event.id || event._id || '';
};

/**
 * Parse boolean-like values from API (handles "True", "true", empty, false)
 */
export const parseBoolean = (value: string | boolean | undefined | null): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
};

/**
 * Get event status (paid, ready, sent)
 */
export const getEventStatus = (event: Event): EventStatus => {
  return {
    isPaid: parseBoolean(event.Paid),
    isReady: parseBoolean(event.Ready),
    isSent: parseBoolean(event.Sent),
  };
};

/**
 * Parse price/payment values
 */
export const parseAmount = (value: string | number | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Get category icon based on event type
 */
export const getCategoryIcon = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'Wedding': '💒',
    'Bar Mitzvah': '🎉',
    'Vort': '💍',
    'Bris': '👶',
    'Pidyon Haben': '🍼',
    'School': '🏫',
    'Photoshoot': '📸',
  };

  return categoryMap[category] || '📅';
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Return as-is if not 10 digits
  return phone;
};

/**
 * Search events by multiple fields
 */
export const searchEvents = (events: Event[], query: string): Event[] => {
  if (!query.trim()) return events;

  const lowerQuery = query.toLowerCase();

  return events.filter((event) => {
    return (
      event.Name?.toLowerCase().includes(lowerQuery) ||
      event.Place?.toLowerCase().includes(lowerQuery) ||
      event.Address?.toLowerCase().includes(lowerQuery) ||
      event.Phone?.includes(query) ||
      event.Category?.toLowerCase().includes(lowerQuery)
    );
  });
};

/**
 * Sort events by date (ascending)
 */
export const sortEventsByDate = (events: Event[]): Event[] => {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.EventDate).getTime();
    const dateB = new Date(b.EventDate).getTime();
    return dateA - dateB;
  });
};
