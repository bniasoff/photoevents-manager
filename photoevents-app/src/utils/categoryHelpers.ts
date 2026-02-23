import { Event, EventCategory } from '../types/Event';

/**
 * Determine category based on event name and category field
 */
const determineCategory = (event: Event): EventCategory => {
  const name = event.Name?.toLowerCase() || '';

  // Check for special categories based on event name
  if (name.includes('cm') || name.includes('c.m')) {
    return 'CM';
  }
  if (name.includes('parlor')) {
    return 'Parlor Meeting';
  }
  if (name.includes('siyum')) {
    return 'Siyum';
  }
  if (name.includes("l'chaim") || name.includes('lchaim') || name.includes('lechaim') || name.includes('chaim')) {
    return "L'Chaim";
  }

  // Fall back to the Category field
  const category = event.Category || 'Other';

  // Normalize known misspellings
  const normalized = category.trim();
  if (normalized.toLowerCase() === 'kolell') return 'Kollel';

  const validCategories: EventCategory[] = [
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
    'Other'
  ];

  // Case-insensitive match
  const match = validCategories.find(
    (c) => c.toLowerCase() === normalized.toLowerCase()
  );
  if (match) return match;

  return 'Other';
};

const emptyGroups = (): Record<EventCategory, Event[]> => ({
  'Bar Mitzvah': [],
  'Bat Mitzvah': [],
  'Wedding': [],
  'Vort': [],
  'Bris': [],
  'Pidyon Haben': [],
  'School': [],
  'Photoshoot': [],
  'CM': [],
  'Parlor Meeting': [],
  'Siyum': [],
  "L'Chaim": [],
  'Chanukas Habayis': [],
  'Melava Malka': [],
  'Presentation': [],
  'Shiur': [],
  'Advertisements': [],
  'Apsherin': [],
  'Beis Medrash': [],
  'Birthday': [],
  'Even Hapina': [],
  'Hachnosas Sefer Torah': [],
  'Kollel': [],
  'Seudas Hodah': [],
  'Yorzeit': [],
  'Other': [],
});

/**
 * Group events by category
 */
export const groupEventsByCategory = (
  events: Event[]
): Record<EventCategory, Event[]> => {
  const groups = emptyGroups();

  events.forEach((event) => {
    const category = determineCategory(event);
    groups[category].push(event);
  });

  return groups;
};

/**
 * Group events by year, then by category within each year
 */
export const groupEventsByYearAndCategory = (
  events: Event[]
): Record<string, Record<EventCategory, Event[]>> => {
  const yearGroups: Record<string, Record<EventCategory, Event[]>> = {};

  events.forEach((event) => {
    const year = new Date(event.EventDate).getFullYear().toString();

    if (!yearGroups[year]) {
      yearGroups[year] = emptyGroups();
    }

    const category = determineCategory(event);
    yearGroups[year][category].push(event);
  });

  return yearGroups;
};

/**
 * Get emoji icon for category
 */
export const getCategoryIcon = (category: EventCategory | string): string => {
  const icons: Record<EventCategory, string> = {
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

  return icons[category as EventCategory] || icons['Other'];
};
