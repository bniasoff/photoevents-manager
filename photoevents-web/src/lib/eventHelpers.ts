import type { Event } from '../types/Event';

export const parseBoolean = (value: string | boolean | undefined | null): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
};

export const parseAmount = (value: string | number | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

export const getEventStatus = (event: Event) => ({
  isPaid: parseBoolean(event.Paid),
  isReady: parseBoolean(event.Ready),
  isSent: parseBoolean(event.Sent),
});

/**
 * True if the event's date/time (EventDate + Start, when set) is already in the past.
 */
export const isPastEvent = (event: Event): boolean => {
  let eventDateTime = new Date(event.EventDate);
  if (event.Start) {
    const dateOnly = event.EventDate.split('T')[0];
    eventDateTime = new Date(`${dateOnly}T${event.Start}`);
  }
  return eventDateTime < new Date();
};

/**
 * Unpaid = not paid, not a Weinman event (separate arrangement, excluded from tracking),
 * and only for events that have already happened — matches the mobile app's "Didn't Pay" rule.
 */
export const isUnpaid = (event: Event): boolean => {
  const { isPaid } = getEventStatus(event);
  return !isPaid && !event.Weinman && isPastEvent(event);
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = (phone || '').replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const searchEvents = (events: Event[], query: string): Event[] => {
  if (!query.trim()) return events;
  const q = query.toLowerCase();
  return events.filter(
    (e) =>
      e.Name?.toLowerCase().includes(q) ||
      e.Place?.toLowerCase().includes(q) ||
      e.Address?.toLowerCase().includes(q) ||
      e.Phone?.includes(query) ||
      e.Category?.toLowerCase().includes(q)
  );
};

export const formatMoney = (value: string | number | undefined): string =>
  parseAmount(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const formatTime = (time: string): string => {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${period}`;
};

export const formatDate = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
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
