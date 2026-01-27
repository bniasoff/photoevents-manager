import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Event } from '../types/Event';
import { getEventStatus } from '../utils/eventHelpers';
import { parseISO, differenceInHours, isAfter } from 'date-fns';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }

  // Configure notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });
  }

  return true;
};

/**
 * Schedule a notification for an upcoming event
 */
export const scheduleEventNotification = async (
  event: Event,
  hoursBeforeEvent: number = 24
): Promise<string | null> => {
  try {
    const eventDate = parseISO(event.EventDate);
    const now = new Date();

    // Check if event is in the future
    if (!isAfter(eventDate, now)) {
      return null;
    }

    // Calculate notification time
    const hoursUntilEvent = differenceInHours(eventDate, now);

    if (hoursUntilEvent < hoursBeforeEvent) {
      return null; // Event is too soon to schedule this notification
    }

    const notificationTime = new Date(
      eventDate.getTime() - hoursBeforeEvent * 60 * 60 * 1000
    );

    // Schedule the notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Event Reminder: ${event.Name}`,
        body: `${event.Category} at ${event.Place || 'venue'} - ${hoursBeforeEvent}hrs away`,
        data: { eventId: event._id, type: 'upcoming' },
        sound: true,
      },
      trigger: notificationTime,
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling event notification:', error);
    return null;
  }
};

/**
 * Schedule notification for unpaid event
 */
export const scheduleUnpaidNotification = async (
  event: Event
): Promise<string | null> => {
  try {
    const status = getEventStatus(event);

    if (status.isPaid) {
      return null; // Already paid
    }

    const eventDate = parseISO(event.EventDate);
    const now = new Date();

    // Don't send reminder if event is in the past
    if (!isAfter(eventDate, now)) {
      return null;
    }

    // Schedule notification for 7 days from now (or next available time)
    const notificationTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💰 Payment Reminder',
        body: `${event.Name} - ${event.Category} event payment pending`,
        data: { eventId: event._id, type: 'unpaid' },
        sound: true,
      },
      trigger: notificationTime,
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling unpaid notification:', error);
    return null;
  }
};

/**
 * Schedule notification for ready but not sent event
 */
export const scheduleReadyNotSentNotification = async (
  event: Event
): Promise<string | null> => {
  try {
    const status = getEventStatus(event);

    if (!status.isReady || status.isSent) {
      return null; // Not in the right state
    }

    const now = new Date();
    // Schedule notification for 3 days from now
    const notificationTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📤 Ready to Send',
        body: `${event.Name} - ${event.Category} photos are ready but not sent`,
        data: { eventId: event._id, type: 'readyNotSent' },
        sound: true,
      },
      trigger: notificationTime,
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling ready not sent notification:', error);
    return null;
  }
};

/**
 * Schedule all notifications for an event
 */
export const scheduleAllNotificationsForEvent = async (
  event: Event,
  settings: {
    upcomingEvent24h?: boolean;
    upcomingEvent1week?: boolean;
    unpaidReminders?: boolean;
    readyNotSentReminders?: boolean;
  } = {}
): Promise<void> => {
  const {
    upcomingEvent24h = true,
    upcomingEvent1week = true,
    unpaidReminders = true,
    readyNotSentReminders = true,
  } = settings;

  try {
    // Schedule 24-hour reminder
    if (upcomingEvent24h) {
      await scheduleEventNotification(event, 24);
    }

    // Schedule 1-week reminder
    if (upcomingEvent1week) {
      await scheduleEventNotification(event, 168); // 7 days
    }

    // Schedule unpaid reminder
    if (unpaidReminders) {
      await scheduleUnpaidNotification(event);
    }

    // Schedule ready but not sent reminder
    if (readyNotSentReminders) {
      await scheduleReadyNotSentNotification(event);
    }
  } catch (error) {
    console.error('Error scheduling notifications for event:', error);
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Get all scheduled notifications
 */
export const getAllScheduledNotifications = async () => {
  return await Notifications.getAllScheduledNotificationsAsync();
};

/**
 * Check if notifications are enabled
 */
export const areNotificationsEnabled = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
};
