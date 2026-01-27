import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  format,
  parseISO,
} from 'date-fns';
import { Event, DateGroupKey } from '../types/Event';

/**
 * Format event date and time for display
 */
export const formatEventDateTime = (event: Event): string => {
  try {
    const date = parseISO(event.EventDate);
    const dateStr = format(date, 'MMM d, yyyy');

    if (event.Start) {
      // Parse time (HH:MM:SS format)
      const [hours, minutes] = event.Start.split(':');
      const timeStr = format(
        new Date(2000, 0, 1, parseInt(hours), parseInt(minutes)),
        'h:mm a'
      );
      return `${dateStr} @ ${timeStr}`;
    }

    return dateStr;
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Format date only
 */
export const formatEventDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Get date range for a specific group
 */
export const getDateRange = (groupKey: DateGroupKey): { start: Date; end: Date } | null => {
  const now = new Date();

  switch (groupKey) {
    case 'lastWeek':
      return {
        start: startOfWeek(subWeeks(now, 1)),
        end: endOfWeek(subWeeks(now, 1)),
      };
    case 'thisWeek':
      return {
        start: startOfWeek(now),
        end: endOfWeek(now),
      };
    case 'nextWeek':
      return {
        start: startOfWeek(addWeeks(now, 1)),
        end: endOfWeek(addWeeks(now, 1)),
      };
    case 'lastMonth':
      return {
        start: startOfMonth(subMonths(now, 1)),
        end: endOfMonth(subMonths(now, 1)),
      };
    case 'thisMonth':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    case 'nextMonth':
      return {
        start: startOfMonth(addMonths(now, 1)),
        end: endOfMonth(addMonths(now, 1)),
      };
    case 'future':
      return null; // Special case: all events after next month
  }
};

/**
 * Determine which date group an event belongs to
 */
export const getEventDateGroup = (event: Event): DateGroupKey | null => {
  try {
    const eventDate = parseISO(event.EventDate);
    const now = new Date();

    // Check each group in order
    const groups: DateGroupKey[] = [
      'lastWeek',
      'thisWeek',
      'nextWeek',
      'lastMonth',
      'thisMonth',
      'nextMonth',
    ];

    for (const groupKey of groups) {
      const range = getDateRange(groupKey);
      if (range && isWithinInterval(eventDate, range)) {
        return groupKey;
      }
    }

    // If after next month, it's a future event
    const nextMonthEnd = endOfMonth(addMonths(now, 1));
    if (eventDate > nextMonthEnd) {
      return 'future';
    }

    return null; // Event is in the past (before last week)
  } catch (error) {
    return null;
  }
};

/**
 * Group events by date ranges
 */
export const groupEventsByDate = (
  events: Event[]
): Record<DateGroupKey, Event[]> => {
  const groups: Record<DateGroupKey, Event[]> = {
    lastWeek: [],
    thisWeek: [],
    nextWeek: [],
    lastMonth: [],
    thisMonth: [],
    nextMonth: [],
    future: [],
  };

  events.forEach((event) => {
    const group = getEventDateGroup(event);
    if (group) {
      groups[group].push(event);
    }
  });

  return groups;
};

/**
 * Get label for date group
 */
export const getDateGroupLabel = (groupKey: DateGroupKey): string => {
  const labels: Record<DateGroupKey, string> = {
    lastWeek: 'Last Week',
    thisWeek: 'This Week',
    nextWeek: 'Next Week',
    lastMonth: 'Last Month',
    thisMonth: 'This Month',
    nextMonth: 'Next Month',
    future: 'Future Events',
  };

  return labels[groupKey];
};
