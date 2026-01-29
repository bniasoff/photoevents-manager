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
  const validCategories: EventCategory[] = [
    'Bar Mitzvah',
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
    'Other'
  ];

  if (validCategories.includes(category as EventCategory)) {
    return category as EventCategory;
  }

  return 'Other';
};

/**
 * Group events by category
 */
export const groupEventsByCategory = (
  events: Event[]
): Record<EventCategory, Event[]> => {
  const groups: Record<EventCategory, Event[]> = {
    'Bar Mitzvah': [],
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
    'Other': [],
  };

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
    // Extract year from EventDate
    const year = new Date(event.EventDate).getFullYear().toString();

    // Initialize year group if it doesn't exist
    if (!yearGroups[year]) {
      yearGroups[year] = {
        'Bar Mitzvah': [],
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
        'Other': [],
      };
    }

    // Get category and add event to the appropriate year and category
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
    'Vort': '💍',
    'Bris': '👶',
    'Pidyon Haben': '🍼',
    'School': '🏫',
    'Photoshoot': '📸',
    'CM': '🏛️',
    'Parlor Meeting': '🏠',
    'Siyum': '📖',
    "L'Chaim": '🥂',
    'Other': '📅',
  };

  return icons[category as EventCategory] || icons['Other'];
};
