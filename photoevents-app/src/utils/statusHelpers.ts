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

    // Check if Weinman checkbox is true (treat as paid for filtering)
    const isWeinman = event.Weinman || false;

    // Check if event time has already passed (compare full timestamp)
    // If EventDate doesn't include time but Start time exists, combine them
    let eventDateTime = new Date(event.EventDate);

    // If the event has a Start time and EventDate is at midnight, use the Start time
    if (event.Start && event.Start !== '') {
      const dateOnly = event.EventDate.split('T')[0];
      eventDateTime = new Date(`${dateOnly}T${event.Start}`);
    }

    const now = new Date();
    const isPastEvent = eventDateTime < now;

    // Check unpaid (only past events, exclude Weinman)
    if (!status.isPaid && !isWeinman && isPastEvent) {
      groups.unpaid.push(event);
    }

    // Check not ready (only past events)
    if (!status.isReady && isPastEvent) {
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
