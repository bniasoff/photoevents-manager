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
  Category: string;
  SimchaInitiative?: boolean;
  Projector?: boolean;
  Weinman?: boolean;
  Referral?: string | null;
  Feedback?: string | null;
  Ratings?: number | null;
  CreatedDate?: string;
  EtagID?: string;
  updatedAt?: string;
  createdAt?: string;
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
