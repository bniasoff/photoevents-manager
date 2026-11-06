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
 * Expand events with multi-date locations into virtual continuation occurrences.
 * The primary occurrence keeps its EventDate; each additional unique location date
 * gets a copy with EventDate overridden so grouping/sorting helpers work unchanged.
 * Display-only — copies share the same id, so tapping opens the same EventDetailModal.
 */
export const expandEventsForDisplay = (events: Event[]): Event[] => {
  const result: Event[] = [];
  events.forEach(event => {
    const primaryDate = event.EventDate?.slice(0, 10) ?? '';
    const otherDates = [...new Set(
      (event.locations ?? [])
        .map(loc => loc.eventDate)
        .filter((d): d is string => !!d && d !== primaryDate)
    )];

    // Primary occurrence
    result.push({ ...event, _isContinuation: false, _continuationDates: otherDates });

    // One continuation occurrence per extra date
    otherDates.forEach(date => {
      result.push({
        ...event,
        EventDate: date + 'T12:00:00',  // override for grouping
        _isContinuation: true,
        _continuationFromDate: primaryDate,
        _continuationDates: [],
      });
    });
  });
  return result;
};

/**
 * Sort events by date or name
 */
export const sortEventsByDate = (events: Event[], order: 'asc' | 'desc' | 'name-asc' | 'name-desc' = 'asc'): Event[] => {
  return [...events].sort((a, b) => {
    if (order === 'name-asc' || order === 'name-desc') {
      const nameA = (a.Name || '').toLowerCase();
      const nameB = (b.Name || '').toLowerCase();
      const cmp = nameA.localeCompare(nameB);
      return order === 'name-asc' ? cmp : -cmp;
    }
    const dateA = new Date(a.EventDate).getTime();
    const dateB = new Date(b.EventDate).getTime();
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
};

export interface AddressParts {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export const DEFAULT_ADDRESS: AddressParts = { street: '', city: 'Lakewood', state: 'NJ', zip: '08701' };

// Sensible city/state/zip starting points per places_directory region, so adding a new
// place in a non-Lakewood region doesn't get mislabeled as Lakewood, NJ. Some regions
// (brooklyn, crown_heights, queens, five_towns) span multiple zip codes, so zip is left
// blank there for the user to fill in.
export const REGION_DEFAULTS: Record<string, AddressParts> = {
  lakewood: { street: '', city: 'Lakewood', state: 'NJ', zip: '08701' },
  brooklyn: { street: '', city: 'Brooklyn', state: 'NY', zip: '' },
  crown_heights: { street: '', city: 'Brooklyn', state: 'NY', zip: '' },
  monsey: { street: '', city: 'Monsey', state: 'NY', zip: '10952' },
  five_towns: { street: '', city: '', state: 'NY', zip: '' },
  queens: { street: '', city: 'Queens', state: 'NY', zip: '' },
  passaic: { street: '', city: 'Passaic', state: 'NJ', zip: '07055' },
  teaneck: { street: '', city: 'Teaneck', state: 'NJ', zip: '07666' },
  staten_island: { street: '', city: 'Staten Island', state: 'NY', zip: '' },
};

// Finds a standalone NY/NJ state abbreviation anywhere in the address (the only two states
// this app operates in — case-insensitive, since older data has "Nj"/"nj"), preferring the
// last match since the state almost always appears near the end.
const STATE_TOKEN = /\b(NY|NJ)\b/gi;

// Real multi-word city/neighborhood names seen in this dataset's no-comma addresses
// ("123 Main St Spring Valley NY"). Without this, the single-last-word fallback below
// would chop "Spring Valley" down to "Valley", "Staten Island" down to "Island", etc.
// Ordered longest-first so "Kew Gardens Hills" wins over the shorter "Kew Gardens".
const MULTI_WORD_CITIES = [
  'Kew Gardens Hills',
  'Staten Island',
  'Spring Valley',
  'Toms River',
  'Chestnut Ridge',
  'Far Rockaway',
  'Wesley Hills',
  'New Square',
  'Kew Gardens',
].sort((a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length);

function matchMultiWordCity(before: string): { city: string; street: string } | null {
  const lower = before.toLowerCase().replace(/'/g, '');
  for (const city of MULTI_WORD_CITIES) {
    const cityLower = city.toLowerCase();
    if (lower === cityLower) return { city, street: '' };
    if (lower.endsWith(' ' + cityLower)) {
      return { city, street: before.slice(0, before.length - city.length).trim() };
    }
  }
  return null;
}

/** Best-effort split of a combined address string into parts, used when a place/event
 * only has the old single `address` string and hasn't been backfilled with structured
 * columns yet. Historical addresses mix punctuation wildly — "Street, City, ST zip",
 * "Street, City ST, zip", "Street,City,ST,zip", spelled-out "New Jersey", no state at
 * all — so this parses in stages rather than with one fixed-shape regex. Falls back to
 * `fallback` (default: Lakewood, NJ 08701) for whatever it can't recognize, except a
 * trailing comma-separated city name is kept even when no state/zip is found, so a real
 * city (e.g. "Howell") doesn't get silently overwritten by the Lakewood default. */
export const splitAddress = (address: string | undefined, fallback: AddressParts = DEFAULT_ADDRESS): AddressParts => {
  let addr = (address || '').trim();
  if (!addr) return { street: '', city: fallback.city, state: fallback.state, zip: fallback.zip };

  // Strip a trailing country suffix like ", USA" (tolerating the occasional typo "USAe"/"USAt")
  addr = addr.replace(/,?\s*USA[a-zA-Z]?\s*$/, '').trim();
  // Normalize spelled-out states so the token search below catches them too
  addr = addr.replace(/\bnew\s+jersey\b/gi, 'NJ').replace(/\bnew\s+york\b/gi, 'NY');

  let stateMatch: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  STATE_TOKEN.lastIndex = 0;
  while ((m = STATE_TOKEN.exec(addr))) stateMatch = m;

  if (stateMatch) {
    const state = stateMatch[1].toUpperCase();
    const before = addr.slice(0, stateMatch.index).trim().replace(/,$/, '').trim();
    const after = addr.slice(stateMatch.index + state.length).replace(/^,/, '').trim();
    const zipMatch = after.match(/^(\d{4,5}(?:-\d{4})?)/);

    let street = before;
    let city = fallback.city;
    const lastComma = before.lastIndexOf(',');
    if (lastComma !== -1) {
      city = before.slice(lastComma + 1).trim();
      street = before.slice(0, lastComma).trim();
    } else {
      const mw = matchMultiWordCity(before);
      if (mw) {
        city = mw.city;
        street = mw.street;
      } else {
        const words = before.split(' ').filter(Boolean);
        if (words.length > 1) {
          city = words[words.length - 1];
          street = words.slice(0, -1).join(' ');
        }
      }
    }
    city = city || fallback.city;
    // Only fall back to the default zip when the parsed city actually matches the default's
    // city (e.g. Lakewood) — a Howell or Brick address has no business inheriting 08701.
    const sameCityAsFallback = city.toLowerCase() === (fallback.city || '').toLowerCase();
    let zip = zipMatch ? zipMatch[1] : '';
    if (zip && !sameCityAsFallback && fallback.zip && zip === fallback.zip) {
      // The address literally contains the default zip (e.g. "08701") but the city isn't
      // the default city — almost certainly a copy-pasted/habitual zip, not a real one.
      zip = '';
    } else if (!zip && sameCityAsFallback) {
      zip = fallback.zip || '';
    }
    return { street, city, state, zip };
  }

  // No NY/NJ found — if the address still ends in a plain comma-separated city name
  // (no digits), keep it rather than overwriting it with the Lakewood/region default.
  const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (/^[A-Za-z][A-Za-z .'-]*$/.test(last) && last.split(' ').filter(Boolean).length <= 3) {
      const sameCityAsFallback = last.toLowerCase() === (fallback.city || '').toLowerCase();
      return { street: parts.slice(0, -1).join(', '), city: last, state: fallback.state, zip: sameCityAsFallback ? (fallback.zip || '') : '' };
    }
  }

  return { street: addr, city: fallback.city, state: fallback.state, zip: fallback.zip };
};

export const buildAddress = (parts: AddressParts): string => {
  const cityStateZip = [parts.city, [parts.state, parts.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [parts.street, cityStateZip].filter(Boolean).join(', ');
};
