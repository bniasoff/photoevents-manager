import { supabase } from './supabase';
import type { Event, EventLocation } from '../types/Event';
import { splitAddress, buildAddress, DEFAULT_ADDRESS, REGION_DEFAULTS, type AddressParts } from './eventHelpers';

const mapLocation = (row: any): EventLocation => {
  const fallbackParts = splitAddress(row.address);
  return {
    id: row.id,
    eventId: row.event_id,
    place: row.place || '',
    address: row.address || '',
    street: row.street || fallbackParts.street,
    city: row.city || fallbackParts.city,
    state: row.state || fallbackParts.state,
    zip: row.zip || fallbackParts.zip,
    eventDate: row.event_date || '',
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    sortOrder: row.sort_order ?? 0,
  };
};

const mapSupabaseToEvent = (row: any): Event => ({
  id: row.id,
  Name: row.name || '',
  Place: row.place || '',
  Address: row.address || '',
  Street: row.street || splitAddress(row.address).street,
  City: row.city || splitAddress(row.address).city,
  State: row.state || splitAddress(row.address).state,
  Zip: row.zip || splitAddress(row.address).zip,
  Phone: row.phone || '',
  Phone2: row.phone2 || '',
  Phone3: row.phone3 || '',
  Category: row.category || '',
  Place2: row.place2 || '',
  Address2: row.address2 || '',
  Place3: row.place3 || '',
  Address3: row.address3 || '',
  EventDate: row.event_date,
  Start: row.start_time || '',
  End: row.end_time || '',
  Charge: row.charge || 0,
  Payment: row.payment || 0,
  Bal: row.balance || '',
  Paid: row.paid || false,
  Ready: row.ready || false,
  Sent: row.sent || false,
  Info: row.info || '',
  SimchaInitiative: row.simcha_initiative || false,
  Projector: row.projector || false,
  Weinman: row.weinman || false,
  Referral: row.referral || null,
  Feedback: row.feedback || null,
  Ratings: row.ratings || null,
  CalendarEventId: row.calendar_event_id || '',
  createdAt: row.created_at || '',
  updatedAt: row.updated_at || '',
  locations: (row.event_locations || [])
    .map(mapLocation)
    .sort((a: EventLocation, b: EventLocation) => a.sortOrder - b.sortOrder),
});

const mapEventToSupabase = (updates: Partial<Event>): Record<string, any> => {
  const out: Record<string, any> = {};
  if (updates.Name !== undefined) out.name = updates.Name;
  if (updates.Place !== undefined) out.place = updates.Place;
  if (updates.Address !== undefined) out.address = updates.Address;
  if (updates.Street !== undefined) out.street = updates.Street;
  if (updates.City !== undefined) out.city = updates.City;
  if (updates.State !== undefined) out.state = updates.State;
  if (updates.Zip !== undefined) out.zip = updates.Zip;
  if (updates.Phone !== undefined) out.phone = updates.Phone;
  if (updates.Phone2 !== undefined) out.phone2 = updates.Phone2;
  if (updates.Phone3 !== undefined) out.phone3 = updates.Phone3;
  if (updates.Category !== undefined) out.category = updates.Category;
  if (updates.Place2 !== undefined) out.place2 = updates.Place2;
  if (updates.Address2 !== undefined) out.address2 = updates.Address2;
  if (updates.Place3 !== undefined) out.place3 = updates.Place3;
  if (updates.Address3 !== undefined) out.address3 = updates.Address3;
  if (updates.EventDate !== undefined) out.event_date = updates.EventDate;
  if (updates.Start !== undefined) out.start_time = updates.Start;
  if (updates.End !== undefined) out.end_time = updates.End;
  if (updates.Charge !== undefined) out.charge = parseFloat(updates.Charge as any) || 0;
  if (updates.Payment !== undefined) out.payment = parseFloat(updates.Payment as any) || 0;
  if (updates.Bal !== undefined) out.balance = parseFloat(updates.Bal as any) || 0;
  if (updates.Paid !== undefined) out.paid = updates.Paid === true || updates.Paid === 'True';
  if (updates.Ready !== undefined) out.ready = updates.Ready === true || updates.Ready === 'True';
  if (updates.Sent !== undefined) out.sent = updates.Sent === true || updates.Sent === 'True';
  if (updates.Info !== undefined) out.info = updates.Info;
  if (updates.SimchaInitiative !== undefined) out.simcha_initiative = updates.SimchaInitiative;
  if (updates.Projector !== undefined) out.projector = updates.Projector;
  if (updates.Weinman !== undefined) out.weinman = updates.Weinman;
  if (updates.Referral !== undefined) out.referral = updates.Referral;
  if (updates.Feedback !== undefined) out.feedback = updates.Feedback;
  if (updates.Ratings !== undefined) out.ratings = updates.Ratings;
  if (updates.CalendarEventId !== undefined) out.calendar_event_id = updates.CalendarEventId;
  return out;
};

export const fetchEvents = async (): Promise<Event[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*, event_locations(*)')
    .order('event_date', { ascending: true })
    .limit(5000);
  if (error) throw error;
  return (data || []).map(mapSupabaseToEvent);
};

export const createEvent = async (eventData: Partial<Event>): Promise<Event> => {
  const { data, error } = await supabase
    .from('events')
    .insert(mapEventToSupabase(eventData))
    .select()
    .single();
  if (error) throw error;
  return mapSupabaseToEvent(data);
};

export const updateEvent = async (eventId: string, updates: Partial<Event>): Promise<Event> => {
  const { data, error } = await supabase
    .from('events')
    .update(mapEventToSupabase(updates))
    .eq('id', eventId)
    .select()
    .single();
  if (error) throw error;
  return mapSupabaseToEvent(data);
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;
};

export const saveEventLocations = async (
  eventId: string,
  locations: Omit<EventLocation, 'id' | 'eventId'>[]
): Promise<EventLocation[]> => {
  const { error: deleteError } = await supabase.from('event_locations').delete().eq('event_id', eventId);
  if (deleteError) throw deleteError;
  if (locations.length === 0) return [];

  const rows = locations.map((loc, i) => ({
    event_id: eventId,
    place: loc.place,
    address: loc.address,
    street: loc.street || '',
    city: loc.city || '',
    state: loc.state || '',
    zip: loc.zip || '',
    event_date: loc.eventDate || '',
    start_time: loc.startTime || '',
    end_time: loc.endTime || '',
    sort_order: i,
  }));

  const { data, error } = await supabase.from('event_locations').insert(rows).select();
  if (error) throw error;
  return (data || []).map(mapLocation).sort((a, b) => a.sortOrder - b.sortOrder);
};

export interface PlaceRecord extends AddressParts {
  address: string;
}

const toPlaceRecord = (r: any): PlaceRecord => {
  const fallback = REGION_DEFAULTS[r.region] || DEFAULT_ADDRESS;
  const parsed = splitAddress(r.address, fallback);
  return {
    address: r.address || '',
    street: r.street || parsed.street,
    city: r.city || parsed.city,
    state: r.state || parsed.state,
    zip: r.zip || parsed.zip,
  };
};

export const fetchPlaces = async (region: string = 'lakewood'): Promise<Record<string, PlaceRecord>> => {
  const map: Record<string, PlaceRecord> = {};
  if (region === 'lakewood') {
    const [eventsRes, dirRes] = await Promise.all([
      supabase.from('events').select('place, address, street, city, state, zip').order('place'),
      supabase.from('places_directory').select('name, address, street, city, state, zip, region').eq('region', 'lakewood').order('name'),
    ]);
    (eventsRes.data || []).forEach((r: any) => {
      const p = (r.place || '').trim();
      if (p && map[p] === undefined) map[p] = toPlaceRecord({ ...r, region: 'lakewood' });
    });
    (dirRes.data || []).forEach((r: any) => {
      const p = (r.name || '').trim();
      if (p) map[p] = toPlaceRecord(r);
    });
  } else {
    const { data } = await supabase
      .from('places_directory')
      .select('name, address, street, city, state, zip, region')
      .eq('region', region)
      .order('name');
    (data || []).forEach((r: any) => {
      const p = (r.name || '').trim();
      if (p) map[p] = toPlaceRecord(r);
    });
  }
  return map;
};

export const savePlace = async (name: string, parts: AddressParts, region: string = 'lakewood'): Promise<void> => {
  const address = buildAddress(parts);
  await supabase.from('places_directory').upsert(
    {
      name: name.trim(),
      address,
      street: parts.street.trim(),
      city: parts.city.trim(),
      state: parts.state.trim(),
      zip: parts.zip.trim(),
      region,
    },
    { onConflict: 'name' }
  );
};

export const deletePlace = async (name: string): Promise<void> => {
  const { error } = await supabase.from('places_directory').delete().eq('name', name);
  if (error) throw error;
};

export const fetchCategories = async (): Promise<string[]> => {
  const { data } = await supabase.from('categories').select('name').order('sort_order');
  return (data || []).map((r: any) => r.name).filter(Boolean);
};

export const saveCategory = async (name: string): Promise<void> => {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { data } = await supabase
    .from('categories')
    .select('sort_order')
    .lt('sort_order', 1000)
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = ((data && data[0]?.sort_order) ?? 0) + 1;
  await supabase.from('categories').upsert({ name: trimmed, sort_order: nextOrder }, { onConflict: 'name' });
};

export const deleteCategory = async (name: string): Promise<void> => {
  const { error } = await supabase.from('categories').delete().eq('name', name);
  if (error) throw error;
};
