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
  parseISO,
} from 'date-fns';
import type { Event } from '../types/Event';

export type DateGroupKey = 'lastWeek' | 'thisWeek' | 'nextWeek' | 'lastMonth' | 'thisMonth' | 'nextMonth' | 'future';

export const DATE_GROUP_ORDER: DateGroupKey[] = [
  'lastWeek',
  'thisWeek',
  'nextWeek',
  'lastMonth',
  'thisMonth',
  'nextMonth',
  'future',
];

export const getDateGroupLabel = (key: DateGroupKey): string => {
  const labels: Record<DateGroupKey, string> = {
    lastWeek: 'Last Week',
    thisWeek: 'This Week',
    nextWeek: 'Next Week',
    lastMonth: 'Previous Month',
    thisMonth: 'This Month',
    nextMonth: 'Next Month',
    future: 'Future Events',
  };
  return labels[key];
};

const getDateRange = (groupKey: DateGroupKey): { start: Date; end: Date } | null => {
  const now = new Date();
  switch (groupKey) {
    case 'lastWeek':
      return { start: startOfWeek(subWeeks(now, 1)), end: endOfWeek(subWeeks(now, 1)) };
    case 'thisWeek':
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case 'nextWeek':
      return { start: startOfWeek(addWeeks(now, 1)), end: endOfWeek(addWeeks(now, 1)) };
    case 'lastMonth':
      return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case 'thisMonth':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'nextMonth':
      return { start: startOfMonth(addMonths(now, 1)), end: endOfMonth(addMonths(now, 1)) };
    case 'future':
      return null;
  }
};

const getEventDateGroups = (event: Event): DateGroupKey[] => {
  try {
    const dateStr = event.EventDate.slice(0, 10);
    const eventDate = parseISO(dateStr + 'T12:00:00');
    const now = new Date();
    const matching: DateGroupKey[] = [];

    (['lastWeek', 'thisWeek', 'nextWeek', 'lastMonth', 'thisMonth', 'nextMonth'] as DateGroupKey[]).forEach((key) => {
      const range = getDateRange(key);
      if (range && isWithinInterval(eventDate, range)) matching.push(key);
    });

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (eventDate > startOfToday) matching.push('future');

    return matching;
  } catch {
    return [];
  }
};

export const groupEventsByDate = (events: Event[]): Record<DateGroupKey, Event[]> => {
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
    getEventDateGroups(event).forEach((key) => groups[key].push(event));
  });
  return groups;
};
