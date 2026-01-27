import axios from 'axios';
import { Event } from '../types/Event';

const API_BASE_URL = 'https://photoevents-server.onrender.com';

/**
 * Fetch all events from the API
 */
export const fetchEvents = async (): Promise<Event[]> => {
  try {
    const response = await axios.get<Event[]>(`${API_BASE_URL}/photoevents`);
    return response.data;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw new Error('Failed to fetch events. Please try again.');
  }
};

/**
 * Update an event (to be implemented when API endpoints are confirmed)
 */
export const updateEvent = async (
  eventId: string,
  updates: Partial<Event>
): Promise<Event> => {
  try {
    // Try PATCH first (partial update)
    const response = await axios.patch<Event>(
      `${API_BASE_URL}/photoevents/${eventId}`,
      updates
    );
    return response.data;
  } catch (error) {
    console.error('Error updating event:', error);
    throw new Error('Failed to update event. Please try again.');
  }
};

/**
 * Update event status fields (Paid, Ready, Sent)
 */
export const updateEventStatus = async (
  eventId: string,
  status: {
    Paid?: boolean;
    Ready?: boolean;
    Sent?: boolean;
  }
): Promise<Event> => {
  // Convert boolean to string format expected by API
  const updates: Partial<Event> = {};

  if (status.Paid !== undefined) {
    updates.Paid = status.Paid ? 'True' : 'false';
  }
  if (status.Ready !== undefined) {
    updates.Ready = status.Ready ? 'True' : '';
  }
  if (status.Sent !== undefined) {
    updates.Sent = status.Sent ? 'True' : '';
  }

  return updateEvent(eventId, updates);
};
