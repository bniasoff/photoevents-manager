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
 * Format time from HH:MM:SS to 12-hour format
 */
export const formatTime = (timeString: string): string => {
  try {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date(2000, 0, 1, parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  } catch (error) {
    return timeString;
  }
};

/**
 * Format event date and time for display
 */
export const formatEventDateTime = (event: Event): string => {
  try {
    // Extract date and add noon time to avoid timezone issues
    const dateOnly = event.EventDate.slice(0, 10);
    const date = parseISO(dateOnly + 'T12:00:00');
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
    // Extract date and add noon time to avoid timezone issues
    const dateOnly = dateString.slice(0, 10);
    const date = parseISO(dateOnly + 'T12:00:00');
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
 * Determine which date groups an event belongs to (can be multiple)
 */
export const getEventDateGroups = (event: Event): DateGroupKey[] => {
  try {
    // Extract date and add noon time to avoid timezone issues
    const dateStr = event.EventDate.slice(0, 10);
    const eventDate = parseISO(dateStr + 'T12:00:00');
    const now = new Date();

    const matchingGroups: DateGroupKey[] = [];

    // Check all groups
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
        matchingGroups.push(groupKey);
      }
    }

    // All events after today are future events
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (eventDate > startOfToday) {
      matchingGroups.push('future');
    }

    return matchingGroups;
  } catch (error) {
    return [];
  }
};

/**
 * Group events by date ranges (events can appear in multiple groups)
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
    const matchingGroups = getEventDateGroups(event);
    matchingGroups.forEach((groupKey) => {
      groups[groupKey].push(event);
    });
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
