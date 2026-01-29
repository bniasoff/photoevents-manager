import { Event, StatusGroupKey } from '../types/Event';
import { getEventStatus } from './eventHelpers';

/**
 * Group events by status
 */
export const groupEventsByStatus = (
  events: Event[]
): Record<StatusGroupKey, Event[]> => {
  const groups: Record<StatusGroupKey, Event[]> = {
    unpaid: [],
    notReady: [],
    readyNotSent: [],
  };

  events.forEach((event) => {
    const status = getEventStatus(event);

    // Check if phone contains 'Weinman' (treat as paid for filtering)
    const isWeinman = event.Phone?.toLowerCase().includes('weinman') ?? false;

    // Check if event date is in the future
    const eventDate = new Date(event.EventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFutureEvent = eventDate >= today;

    // Check unpaid (exclude Weinman and future events)
    if (!status.isPaid && !isWeinman && !isFutureEvent) {
      groups.unpaid.push(event);
    }

    // Check not ready
    if (!status.isReady) {
      groups.notReady.push(event);
    }

    // Check ready but not sent
    if (status.isReady && !status.isSent) {
      groups.readyNotSent.push(event);
    }
  });

  return groups;
};

/**
 * Get label for status group
 */
export const getStatusGroupLabel = (groupKey: StatusGroupKey): string => {
  const labels: Record<StatusGroupKey, string> = {
    unpaid: "Didn't Pay",
    notReady: 'Not Ready',
    readyNotSent: 'Ready but Not Sent',
  };

  return labels[groupKey];
};

/**
 * Get icon for status group
 */
export const getStatusGroupIcon = (groupKey: StatusGroupKey): string => {
  const icons: Record<StatusGroupKey, string> = {
    unpaid: '💰',
    notReady: '⏳',
    readyNotSent: '✅',
  };

  return icons[groupKey];
};
