// iOS stub — expo-notifications requires native code not available in Expo Go.
// Metro automatically uses this file instead of notificationService.ts on iOS.
import { Event } from '../types/Event';

export const requestNotificationPermissions = async (): Promise<boolean> => false;
export const areNotificationsEnabled = async (): Promise<boolean> => false;
export const scheduleEventNotification = async (_event: Event, _hours?: number): Promise<string | null> => null;
export const scheduleUnpaidNotification = async (_event: Event): Promise<string | null> => null;
export const scheduleReadyNotSentNotification = async (_event: Event): Promise<string | null> => null;
export const scheduleAllNotificationsForEvent = async (_event: Event, _settings?: object): Promise<void> => {};
export const cancelAllNotifications = async (): Promise<void> => {};
export const getAllScheduledNotifications = async () => [];
