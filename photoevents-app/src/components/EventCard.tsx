import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Event } from '../types/Event';
import { theme } from '../theme/theme';
import {
  getCategoryIcon,
  formatPhoneNumber,
  getEventStatus,
  getEventId,
} from '../utils/eventHelpers';
import { formatEventDateTime } from '../utils/dateHelpers';
import { updateEventStatus, deleteEvent } from '../services/api';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
  onLongPress?: (event: Event) => void;
  onUpdate?: (updatedEvent: Event) => void;
  onDelete?: (eventId: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, onLongPress, onUpdate, onDelete }) => {
  const [localEvent, setLocalEvent] = useState(event);
  const [isDeleted, setIsDeleted] = useState(false);
  const status = getEventStatus(localEvent);
  const icon = getCategoryIcon(localEvent.Category);

  useEffect(() => {
    setLocalEvent(event);
  }, [event]);

  const handlePhonePress = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(localEvent);
      return;
    }
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${localEvent.Name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(getEventId(localEvent));
              setIsDeleted(true);
              onDelete?.(getEventId(localEvent));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleStatusBadgePress = (field: 'Paid' | 'Ready' | 'Sent', currentValue: boolean) => {
    const newValue = !currentValue;
    const newLabel = field === 'Paid'
      ? (newValue ? 'PAID' : 'UNPAID')
      : field === 'Ready'
      ? (newValue ? 'READY' : 'NOT READY')
      : (newValue ? 'SENT' : 'NOT SENT');

    Alert.alert(
      'Change Status',
      `Mark "${localEvent.Name}" as ${newLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Change',
          onPress: async () => {
            const previousEvent = { ...localEvent };
            // Optimistic update
            const fieldValue = newValue ? 'True' : '';
            setLocalEvent({ ...localEvent, [field]: fieldValue });
            try {
              const updatedEvent = await updateEventStatus(getEventId(localEvent), { [field]: newValue });
              setLocalEvent(updatedEvent);
              onUpdate?.(updatedEvent);
            } catch (error) {
              setLocalEvent(previousEvent);
              Alert.alert('Error', `Failed to update ${field} status. Please try again.`);
            }
          },
        },
      ]
    );
  };

  if (isDeleted) return null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {localEvent.Name}
          </Text>
        </View>
      </View>

      {/* Category */}
      <Text style={styles.category}>{localEvent.Category}</Text>

      {/* Venue Info */}
      {localEvent.Place && (
        <Text style={styles.venue} numberOfLines={1}>
          📍 {localEvent.Place}
        </Text>
      )}

      {/* Address */}
      {localEvent.Address && (
        <Text style={styles.address} numberOfLines={2}>
          {localEvent.Address}
        </Text>
      )}

      {/* Phone */}
      {localEvent.Phone && (
        <TouchableOpacity onPress={() => handlePhonePress(localEvent.Phone)}>
          <Text style={styles.phone}>📞 {formatPhoneNumber(localEvent.Phone)}</Text>
        </TouchableOpacity>
      )}

      {/* Date & Time */}
      <Text style={styles.dateTime}>📅 {formatEventDateTime(localEvent)}</Text>

      {/* Status Badges */}
      <View style={styles.statusRow}>
        <TouchableOpacity
          style={[
            styles.statusBadge,
            { backgroundColor: status.isPaid ? theme.statusColors.paid : theme.statusColors.unpaid },
          ]}
          onPress={() => handleStatusBadgePress('Paid', status.isPaid)}
        >
          <Text style={styles.statusText}>
            💰 {status.isPaid ? 'PAID' : 'UNPAID'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statusBadge,
            { backgroundColor: status.isReady ? theme.statusColors.ready : theme.statusColors.notReady },
          ]}
          onPress={() => handleStatusBadgePress('Ready', status.isReady)}
        >
          <Text style={styles.statusText}>
            {status.isReady ? '✅ READY' : '⏳ NOT READY'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statusBadge,
            { backgroundColor: status.isSent ? theme.statusColors.sent : theme.statusColors.notSent },
          ]}
          onPress={() => handleStatusBadgePress('Sent', status.isSent)}
        >
          <Text style={styles.statusText}>
            {status.isSent ? '📤 SENT' : '📭 NOT SENT'}
          </Text>
        </TouchableOpacity>
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
    marginLeft: 36,
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
