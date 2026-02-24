import { Event, EventCategory } from '../types/Event';

// Predefined display order for known categories
export const CATEGORY_ORDER: string[] = [
  'Bar Mitzvah',
  'Bat Mitzvah',
  'Wedding',
  'Vort',
  'Bris',
  'Pidyon Haben',
  'School',
  'Photoshoot',
  'CM',
  'Parlor Meeting',
  'Siyum',
  "L'Chaim",
  'Chanukas Habayis',
  'Melava Malka',
  'Presentation',
  'Shiur',
  'Advertisements',
  'Apsherin',
  'Beis Medrash',
  'Birthday',
  'Even Hapina',
  'Hachnosas Sefer Torah',
  'Kollel',
  'Seudas Hodah',
  'Yorzeit',
];

/**
 * Normalize and return the best category string for an event.
 * Returns the actual category value (never silently drops to 'Other').
 */
export const determineCategory = (event: Event): string => {
  const name = event.Name?.toLowerCase() || '';

  // Name-based overrides for ambiguous categories
  if (name.includes('cm') || name.includes('c.m')) return 'CM';
  if (name.includes('parlor')) return 'Parlor Meeting';
  if (name.includes('siyum')) return 'Siyum';
  if (name.includes("l'chaim") || name.includes('lchaim') || name.includes('lechaim') || name.includes('chaim')) return "L'Chaim";

  const raw = (event.Category || '').trim();
  if (!raw) return 'Other';

  // Normalize known misspellings
  if (raw.toLowerCase() === 'kolell') return 'Kollel';

  // Case-insensitive match against known categories
  const match = CATEGORY_ORDER.find((c) => c.toLowerCase() === raw.toLowerCase());
  if (match) return match;

  // Return the raw value as-is so no event is silently hidden
  return raw;
};

/**
 * Group events by year, then by category within each year.
 * Categories are dynamic — whatever values exist in the data.
 */
export const groupEventsByYearAndCategory = (
  events: Event[]
): Record<string, Record<string, Event[]>> => {
  const yearGroups: Record<string, Record<string, Event[]>> = {};

  events.forEach((event) => {
    if (!event.EventDate) return;
    const yearNum = new Date(event.EventDate).getFullYear();
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) return;

    const year = yearNum.toString();
    if (!yearGroups[year]) yearGroups[year] = {};

    const category = determineCategory(event);
    if (!yearGroups[year][category]) yearGroups[year][category] = [];
    yearGroups[year][category].push(event);
  });

  return yearGroups;
};

/**
 * Group events by category (flat, no year).
 */
export const groupEventsByCategory = (
  events: Event[]
): Record<string, Event[]> => {
  const groups: Record<string, Event[]> = {};

  events.forEach((event) => {
    const category = determineCategory(event);
    if (!groups[category]) groups[category] = [];
    groups[category].push(event);
  });

  return groups;
};

/**
 * Sort category names: known categories in predefined order first,
 * then any unknown ones alphabetically, 'Other' always last.
 */
export const sortCategories = (categories: string[]): string[] => {
  return [...categories].sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
};

/**
 * Get emoji icon for category
 */
export const getCategoryIcon = (category: EventCategory | string): string => {
  const icons: Record<string, string> = {
    'Wedding': '💒',
    'Bar Mitzvah': '🎉',
    'Bat Mitzvah': '🌸',
    'Vort': '💍',
    'Bris': '👶',
    'Pidyon Haben': '🍼',
    'School': '🏫',
    'Photoshoot': '📸',
    'CM': '🏛️',
    'Parlor Meeting': '🏠',
    'Siyum': '📖',
    "L'Chaim": '🥂',
    'Chanukas Habayis': '🏡',
    'Melava Malka': '✨',
    'Presentation': '🎤',
    'Shiur': '📚',
    'Advertisements': '📢',
    'Apsherin': '✂️',
    'Beis Medrash': '🕍',
    'Birthday': '🎂',
    'Even Hapina': '🪨',
    'Hachnosas Sefer Torah': '📜',
    'Kollel': '📿',
    'Seudas Hodah': '🙏',
    'Yorzeit': '🕯️',
    'Other': '📅',
  };

  return icons[category] || '📅';
};
