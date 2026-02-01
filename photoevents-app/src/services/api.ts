import { supabase } from '../config/supabase';
import { Event } from '../types/Event';

/**
 * Map Supabase row to Event format
 * Supabase uses lowercase column names, Event type uses uppercase
 */
const mapSupabaseToEvent = (row: any): Event => {
  return {
    id: row.id,
    _id: row.mongodb_id || row.id, // For backwards compatibility
    Name: row.name || '',
    Place: row.place || '',
    Address: row.address || '',
    Phone: row.phone || '',
    Category: row.category || '',
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
    ToDo: row.todo || '',
    SimchaInitiative: row.simcha_initiative || false,
    Projector: row.projector || false,
    Referral: row.referral || null,
    CreatedDate: row.created_date || '',
    EtagID: row.etag_id || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
};

/**
 * Map Event updates to Supabase format
 */
const mapEventToSupabase = (updates: Partial<Event>): any => {
  const supabaseUpdates: any = {};

  if (updates.Name !== undefined) supabaseUpdates.name = updates.Name;
  if (updates.Place !== undefined) supabaseUpdates.place = updates.Place;
  if (updates.Address !== undefined) supabaseUpdates.address = updates.Address;
  if (updates.Phone !== undefined) supabaseUpdates.phone = updates.Phone;
  if (updates.Category !== undefined) supabaseUpdates.category = updates.Category;
  if (updates.EventDate !== undefined) supabaseUpdates.event_date = updates.EventDate;
  if (updates.Start !== undefined) supabaseUpdates.start_time = updates.Start;
  if (updates.End !== undefined) supabaseUpdates.end_time = updates.End;
  if (updates.Charge !== undefined) supabaseUpdates.charge = parseFloat(updates.Charge as any);
  if (updates.Payment !== undefined) supabaseUpdates.payment = parseFloat(updates.Payment as any);
  if (updates.Bal !== undefined) supabaseUpdates.balance = parseFloat(updates.Bal as any);
  if (updates.Paid !== undefined) supabaseUpdates.paid = updates.Paid === 'True' || updates.Paid === true;
  if (updates.Ready !== undefined) supabaseUpdates.ready = updates.Ready === 'True' || updates.Ready === true;
  if (updates.Sent !== undefined) supabaseUpdates.sent = updates.Sent === 'True' || updates.Sent === true;
  if (updates.Info !== undefined) supabaseUpdates.info = updates.Info;
  if (updates.ToDo !== undefined) supabaseUpdates.todo = updates.ToDo;
  if (updates.SimchaInitiative !== undefined) supabaseUpdates.simcha_initiative = updates.SimchaInitiative;
  if (updates.Projector !== undefined) supabaseUpdates.projector = updates.Projector;
  if (updates.Referral !== undefined) supabaseUpdates.referral = updates.Referral;

  return supabaseUpdates;
};

/**
 * Fetch all events from Supabase
 */
export const fetchEvents = async (): Promise<Event[]> => {
  try {
    console.log('Fetching events from Supabase...');

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log(`✓ Fetched ${data?.length || 0} events from Supabase`);

    return (data || []).map(mapSupabaseToEvent);
  } catch (error) {
    console.error('Error fetching events:', error);
    throw new Error('Failed to fetch events. Please try again.');
  }
};

/**
 * Update an event in Supabase
 */
export const updateEvent = async (
  eventId: string,
  updates: Partial<Event>
): Promise<Event> => {
  try {
    console.log('╔═══ SUPABASE UPDATE ═══');
    console.log('║ Event ID:', eventId);
    console.log('║ Updates:', JSON.stringify(updates, null, 2));
    console.log('╚═══════════════════════');

    const supabaseUpdates = mapEventToSupabase(updates);

    console.log('║ Supabase format:', JSON.stringify(supabaseUpdates, null, 2));

    const { data, error } = await supabase
      .from('events')
      .update(supabaseUpdates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    console.log('╔═══ UPDATE RESPONSE ═══');
    console.log('║ Success:', !!data);
    console.log('║ Data:', JSON.stringify(data, null, 2));
    console.log('╚═══════════════════════');

    return mapSupabaseToEvent(data);
  } catch (error) {
    console.error('Error updating event:', error);
    throw new Error('Failed to update event. Please try again.');
  }
};

/**
 * Create a new event in Supabase
 */
export const createEvent = async (eventData: Partial<Event>): Promise<Event> => {
  try {
    const supabaseData = mapEventToSupabase(eventData);

    const { data, error } = await supabase
      .from('events')
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      console.error('Supabase create error:', error);
      throw error;
    }

    return mapSupabaseToEvent(data);
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error('Failed to create event. Please try again.');
  }
};

/**
 * Fetch all distinct places with their addresses from Supabase
 * Returns a map of place name -> address
 */
export const fetchPlaces = async (): Promise<Record<string, string>> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('place, address')
      .order('place');

    if (error) throw error;

    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => {
      const p = (r.place || '').trim();
      const a = (r.address || '').trim();
      if (p && map[p] === undefined) map[p] = a;
    });
    return map;
  } catch (error) {
    console.error('Error fetching places:', error);
    return {};
  }
};

/**
 * Update event status fields (Paid, Ready, Sent) and financial fields (Charge, Payment)
 */
export const updateEventStatus = async (
  eventId: string,
  status: {
    Paid?: boolean;
    Ready?: boolean;
    Sent?: boolean;
    Charge?: number;
    Payment?: number;
  }
): Promise<Event> => {
  console.log('=== UPDATE STATUS ===');
  console.log('Event ID:', eventId);
  console.log('Status updates:', JSON.stringify(status, null, 2));

  // Build updates object
  const updates: Partial<Event> = {};

  if (status.Paid !== undefined) {
    updates.Paid = status.Paid;
    console.log(`Paid: ${status.Paid}`);
  }
  if (status.Ready !== undefined) {
    updates.Ready = status.Ready;
    console.log(`Ready: ${status.Ready}`);
  }
  if (status.Sent !== undefined) {
    updates.Sent = status.Sent;
    console.log(`Sent: ${status.Sent}`);
  }
  if (status.Charge !== undefined) {
    updates.Charge = status.Charge;
    console.log(`Charge: ${status.Charge}`);
  }
  if (status.Payment !== undefined) {
    updates.Payment = status.Payment;
    console.log(`Payment: ${status.Payment}`);
  }

  console.log('====================');

  return updateEvent(eventId, updates);
};
