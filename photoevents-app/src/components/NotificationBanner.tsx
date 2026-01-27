import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../theme/theme';
import {
  requestNotificationPermissions,
  areNotificationsEnabled,
  scheduleAllNotificationsForEvent,
} from '../services/notificationService';
import { Event } from '../types/Event';

interface NotificationBannerProps {
  events: Event[];
  onPermissionsGranted?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  events,
  onPermissionsGranted,
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    const enabled = await areNotificationsEnabled();
    setNotificationsEnabled(enabled);
    setIsChecking(false);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermissions();

    if (granted) {
      setNotificationsEnabled(true);
      Alert.alert(
        'Notifications Enabled',
        'You will now receive reminders for upcoming events and unpaid bookings.',
        [
          {
            text: 'Schedule Notifications',
            onPress: async () => {
              // Schedule notifications for all events
              for (const event of events) {
                await scheduleAllNotificationsForEvent(event);
              }
              Alert.alert(
                'Success',
                `Scheduled notifications for ${events.length} events`
              );
            },
          },
          { text: 'Later', style: 'cancel' },
        ]
      );

      if (onPermissionsGranted) {
        onPermissionsGranted();
      }
    } else {
      Alert.alert(
        'Permission Denied',
        'Please enable notifications in your device settings to receive event reminders.'
      );
    }
  };

  if (isChecking || notificationsEnabled) {
    return null; // Don't show banner if notifications are already enabled
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🔔</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Enable Notifications</Text>
          <Text style={styles.description}>
            Get reminders for upcoming events and unpaid bookings
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={handleEnableNotifications}
      >
        <Text style={styles.buttonText}>Enable</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackgroundAlt,
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.small,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginLeft: theme.spacing.md,
  },
  buttonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
});
