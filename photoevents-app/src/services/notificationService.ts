import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Event } from '../types/Event';
import { getEventStatus, getEventId } from '../utils/eventHelpers';
import { parseISO, differenceInHours, isAfter } from 'date-fns';

// expo-notifications uses PushNotificationIOS which is not available in Expo Go on iOS.
// Use conditional require() so the module never loads in that environment.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const notificationsDisabled = isExpoGo && Platform.OS === 'ios';

let Notifications: any = null;

if (!notificationsDisabled) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    // Notifications not available in this environment
  }
}

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (notificationsDisabled || !Notifications) return false;
  try {
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
  } catch (e) {
    return false;
  }
};

/**
 * Schedule a notification for an upcoming event
 */
export const scheduleEventNotification = async (
  event: Event,
  hoursBeforeEvent: number = 24
): Promise<string | null> => {
  if (notificationsDisabled || !Notifications) return null;
  try {
    const eventDate = parseISO(event.EventDate);
    const now = new Date();

    if (!isAfter(eventDate, now)) return null;

    const hoursUntilEvent = differenceInHours(eventDate, now);
    if (hoursUntilEvent < hoursBeforeEvent) return null;

    const notificationTime = new Date(
      eventDate.getTime() - hoursBeforeEvent * 60 * 60 * 1000
    );

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Event Reminder: ${event.Name}`,
        body: `${event.Category} at ${event.Place || 'venue'} - ${hoursBeforeEvent}hrs away`,
        data: { eventId: getEventId(event), type: 'upcoming' },
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
  if (notificationsDisabled || !Notifications) return null;
  try {
    const status = getEventStatus(event);
    if (status.isPaid) return null;

    const eventDate = parseISO(event.EventDate);
    const now = new Date();
    if (!isAfter(eventDate, now)) return null;

    const notificationTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💰 Payment Reminder',
        body: `${event.Name} - ${event.Category} event payment pending`,
        data: { eventId: getEventId(event), type: 'unpaid' },
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
  if (notificationsDisabled || !Notifications) return null;
  try {
    const status = getEventStatus(event);
    if (!status.isReady || status.isSent) return null;

    const now = new Date();
    const notificationTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📤 Ready to Send',
        body: `${event.Name} - ${event.Category} photos are ready but not sent`,
        data: { eventId: getEventId(event), type: 'readyNotSent' },
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
  if (notificationsDisabled || !Notifications) return;
  const {
    upcomingEvent24h = true,
    upcomingEvent1week = true,
    unpaidReminders = true,
    readyNotSentReminders = true,
  } = settings;

  try {
    if (upcomingEvent24h) await scheduleEventNotification(event, 24);
    if (upcomingEvent1week) await scheduleEventNotification(event, 168);
    if (unpaidReminders) await scheduleUnpaidNotification(event);
    if (readyNotSentReminders) await scheduleReadyNotSentNotification(event);
  } catch (error) {
    console.error('Error scheduling notifications for event:', error);
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  if (notificationsDisabled || !Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Get all scheduled notifications
 */
export const getAllScheduledNotifications = async () => {
  if (notificationsDisabled || !Notifications) return [];
  return await Notifications.getAllScheduledNotificationsAsync();
};

/**
 * Check if notifications are enabled
 */
export const areNotificationsEnabled = async (): Promise<boolean> => {
  if (notificationsDisabled || !Notifications) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    return false;
  }
};
