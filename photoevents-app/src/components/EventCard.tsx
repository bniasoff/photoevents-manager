import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Event } from '../types/Event';
import { theme } from '../theme/theme';
import {
  getCategoryIcon,
  formatPhoneNumber,
  getEventStatus,
} from '../utils/eventHelpers';
import { formatEventDateTime } from '../utils/dateHelpers';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => {
  const status = getEventStatus(event);
  const icon = getCategoryIcon(event.Category);

  const handlePhonePress = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {event.Name}
          </Text>
        </View>
      </View>

      {/* Category */}
      <Text style={styles.category}>{event.Category}</Text>

      {/* Venue Info */}
      {event.Place && (
        <Text style={styles.venue} numberOfLines={1}>
          📍 {event.Place}
        </Text>
      )}

      {/* Address */}
      {event.Address && (
        <Text style={styles.address} numberOfLines={2}>
          {event.Address}
        </Text>
      )}

      {/* Phone */}
      {event.Phone && (
        <TouchableOpacity onPress={() => handlePhonePress(event.Phone)}>
          <Text style={styles.phone}>📞 {formatPhoneNumber(event.Phone)}</Text>
        </TouchableOpacity>
      )}

      {/* Date & Time */}
      <Text style={styles.dateTime}>📅 {formatEventDateTime(event)}</Text>

      {/* Status Badges */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: status.isPaid ? theme.statusColors.paid : theme.statusColors.unpaid },
          ]}
        >
          <Text style={styles.statusText}>
            💰 {status.isPaid ? 'PAID' : 'UNPAID'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: status.isReady
                ? theme.statusColors.ready
                : theme.statusColors.notReady,
            },
          ]}
        >
          <Text style={styles.statusText}>
            {status.isReady ? '✅ READY' : '⏳ NOT READY'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: status.isSent
                ? theme.statusColors.sent
                : theme.statusColors.notSent,
            },
          ]}
        >
          <Text style={styles.statusText}>
            {status.isSent ? '📤 SENT' : '📭 NOT SENT'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    ...theme.shadows.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 28,
    marginRight: theme.spacing.sm,
  },
  name: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  category: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginLeft: 36, // Align with name (icon width + margin)
  },
  venue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  address: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  phone: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  dateTime: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
});
