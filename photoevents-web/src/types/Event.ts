export interface EventLocation {
  id: string;
  eventId: string;
  place: string;
  address: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  eventDate: string; // YYYY-MM-DD or ''
  startTime: string; // HH:MM:SS or ''
  endTime: string; // HH:MM:SS or ''
  sortOrder: number;
}

export interface Event {
  id: string;
  Name: string;
  Place: string;
  Address: string;
  Street?: string;
  City?: string;
  State?: string;
  Zip?: string;
  Charge: string | number;
  Payment: string | number;
  Bal?: string;
  Paid: string | boolean;
  Ready: string | boolean;
  Sent: string | boolean;
  Info?: string;
  EventDate: string; // ISO timestamp
  Start: string; // HH:MM:SS
  End: string; // HH:MM:SS
  Phone: string;
  Phone2?: string;
  Phone3?: string;
  Category: string;
  Place2?: string;
  Address2?: string;
  Place3?: string;
  Address3?: string;
  SimchaInitiative?: boolean;
  Projector?: boolean;
  Weinman?: boolean;
  Referral?: string | null;
  Feedback?: string | null;
  Ratings?: number | null;
  CalendarEventId?: string;
  createdAt?: string;
  updatedAt?: string;
  locations?: EventLocation[];
}

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
  'Other',
];

const CATEGORY_ICONS: Record<string, string> = {
  Wedding: '💒',
  'Bar Mitzvah': '🎉',
  'Bat Mitzvah': '🌸',
  Vort: '💍',
  Bris: '👶',
  'Pidyon Haben': '🍼',
  School: '🏫',
  Photoshoot: '📸',
  CM: '🏛️',
  'Parlor Meeting': '🏠',
  Siyum: '📖',
  "L'Chaim": '🥂',
  'Chanukas Habayis': '🏡',
  'Melava Malka': '✨',
  Presentation: '🎤',
  Shiur: '📚',
  Advertisements: '📢',
  Apsherin: '✂️',
  'Beis Medrash': '🕍',
  Birthday: '🎂',
  'Even Hapina': '🪨',
  'Hachnosas Sefer Torah': '📜',
  Kollel: '📿',
  'Seudas Hodah': '🙏',
  Yorzeit: '🕯️',
  Other: '📅',
};

export const getCategoryIcon = (category: string): string => CATEGORY_ICONS[category] || '📅';

export const PLACES_REGIONS = [
  'lakewood',
  'brooklyn',
  'crown_heights',
  'monsey',
  'five_towns',
  'queens',
  'passaic',
  'teaneck',
  'staten_island',
] as const;
export type PlacesRegion = (typeof PLACES_REGIONS)[number];
