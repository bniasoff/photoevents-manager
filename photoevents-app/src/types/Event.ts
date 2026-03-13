export interface EventLocation {
  id: string;
  eventId: string;
  place: string;
  address: string;
  eventDate: string;   // YYYY-MM-DD or ''
  startTime: string;   // HH:MM:SS or ''
  endTime: string;     // HH:MM:SS or ''
  sortOrder: number;
}

export interface Event {
  id: string; // Xata format (primary)
  _id?: string; // MongoDB format (backwards compatibility)
  ID?: string;
  Name: string;
  Place: string;
  Address: string;
  Charge: string | number;
  Payment: string | number;
  Bal?: string;
  Paid: string | boolean;
  ToDo?: string;
  Ready: string | boolean;
  Sent: string | boolean;
  Info?: string;
  EventDate: string; // ISO 8601 timestamp
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
  CreatedDate?: string;
  EtagID?: string;
  CalendarEventId?: string; // Google Calendar event ID, stored after export
  updatedAt?: string;
  createdAt?: string;
  locations?: EventLocation[];
  // Display-only fields set by expandEventsForDisplay() — never persisted to DB
  _isContinuation?: boolean;
  _continuationFromDate?: string;  // primary date (YYYY-MM-DD) when _isContinuation=true
  _continuationDates?: string[];   // other location dates shown on primary occurrence badge
}

export type EventCategory =
  | 'Bar Mitzvah'
  | 'Wedding'
  | 'Vort'
  | 'Bris'
  | 'Pidyon Haben'
  | 'School'
  | 'Photoshoot'
  | 'CM'
  | 'Parlor Meeting'
  | 'Siyum'
  | "L'Chaim"
  | 'Chanukas Habayis'
  | 'Melava Malka'
  | 'Presentation'
  | 'Shiur'
  | 'Advertisements'
  | 'Apsherin'
  | 'Bat Mitzvah'
  | 'Beis Medrash'
  | 'Birthday'
  | 'Even Hapina'
  | 'Hachnosas Sefer Torah'
  | 'Kollel'
  | 'Seudas Hodah'
  | 'Yorzeit'
  | 'Other';

export interface EventStatus {
  isPaid: boolean;
  isReady: boolean;
  isSent: boolean;
}

export type DateGroupKey =
  | 'lastWeek'
  | 'thisWeek'
  | 'nextWeek'
  | 'lastMonth'
  | 'thisMonth'
  | 'nextMonth'
  | 'future';

export type StatusGroupKey = 'unpaid' | 'notReady' | 'readyNotSent';
