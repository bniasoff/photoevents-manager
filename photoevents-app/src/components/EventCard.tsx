import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Modal, ScrollView, SafeAreaView } from 'react-native';
import { Event } from '../types/Event';
import { theme } from '../theme/theme';
import {
  getCategoryIcon,
  formatPhoneNumber,
  getEventStatus,
  getEventId,
} from '../utils/eventHelpers';
import { formatEventDateTime, formatEventDate, formatTime } from '../utils/dateHelpers';
import { updateEventStatus, deleteEvent } from '../services/api';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
  onLongPress?: (event: Event) => void;
  onUpdate?: (updatedEvent: Event) => void;
  onDelete?: (eventId: string) => void;
  recurringCount?: number;
  relatedEvents?: Event[];
  onRelatedEventPress?: (event: Event) => void;
  isContinuation?: boolean;
  continuationFromDate?: string;
  continuationDates?: string[];
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, onLongPress, onUpdate, onDelete, recurringCount = 0, relatedEvents = [], onRelatedEventPress, isContinuation, continuationFromDate, continuationDates }) => {
  const [localEvent, setLocalEvent] = useState(event);
  const [isDeleted, setIsDeleted] = useState(false);
  const [showRelatedModal, setShowRelatedModal] = useState(false);
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

  const viewDate = localEvent.EventDate?.slice(0, 10) ?? '';
  const activeLoc = isContinuation
    ? (localEvent.locations ?? []).find((loc) => loc.eventDate === viewDate) ?? null
    : (localEvent.locations ?? [])[0] ?? null;
  const scheduleStart = (isContinuation && activeLoc?.startTime) ? activeLoc.startTime : localEvent.Start;
  const scheduleEnd   = (isContinuation && activeLoc?.endTime)   ? activeLoc.endTime   : localEvent.End;

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

      {/* Continuation Badge */}
      {isContinuation && !!continuationFromDate && (
        <View style={styles.continuationBadge}>
          <Text style={styles.continuationText}>
            🔗 Continuation from {formatEventDate(continuationFromDate)}
          </Text>
        </View>
      )}
      {!isContinuation && !!continuationDates?.length && (
        <View style={styles.continuationBadge}>
          <Text style={styles.continuationText}>
            🔗 Also on {continuationDates.map((d) => formatEventDate(d)).join(', ')}
          </Text>
        </View>
      )}

      {/* Recurring Customer Badge */}
      {recurringCount > 0 && (
        <TouchableOpacity
          style={styles.recurringBadge}
          onPress={() => setShowRelatedModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.recurringText}>
            ↻ {recurringCount} prior {recurringCount === 1 ? 'booking' : 'bookings'} — tap to view
          </Text>
        </TouchableOpacity>
      )}

      {/* Related Events Modal */}
      <Modal
        visible={showRelatedModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRelatedModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRelatedModal(false)}
        >
          <SafeAreaView style={styles.relatedModalContainer}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.relatedModalHeader}>
                <View style={{ flex: 1, marginRight: theme.spacing.sm }}>
                  <Text style={styles.relatedModalTitle}>
                    {recurringCount} prior {recurringCount === 1 ? 'booking' : 'bookings'} for {localEvent.Name}
                  </Text>
                  <Text style={styles.relatedModalSubtitle}>
                    📞 Matched by phone: {formatPhoneNumber(localEvent.Phone)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowRelatedModal(false)}>
                  <Text style={styles.relatedModalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.relatedModalList} bounces={false}>
                {relatedEvents.map((e) => (
                  <TouchableOpacity
                    key={getEventId(e)}
                    style={styles.relatedEventRow}
                    onPress={() => {
                      setShowRelatedModal(false);
                      onRelatedEventPress?.(e);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.relatedEventIcon}>{getCategoryIcon(e.Category)}</Text>
                    <View style={styles.relatedEventInfo}>
                      <Text style={styles.relatedEventName}>{e.Name}</Text>
                      <Text style={styles.relatedEventMeta}>
                        {e.Category} · {formatEventDateTime(e)}
                      </Text>
                    </View>
                    <Text style={styles.relatedEventChevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>

      {/* Venue Info */}
      {localEvent.locations && localEvent.locations.length > 0 ? (
        localEvent.locations.map((loc, i) => {
          const hasMultipleLocations = (localEvent.locations?.length ?? 0) > 1;
          const isActive = hasMultipleLocations && (isContinuation
            ? loc.eventDate === viewDate
            : (!loc.eventDate || loc.eventDate === viewDate));
          return (
            <View key={i} style={isActive ? styles.activeLocationBlock : undefined}>
              {!!loc.eventDate && loc.eventDate !== viewDate && (
                <Text style={styles.locationDate}>📅 {formatEventDate(loc.eventDate)}</Text>
              )}
              {!!loc.place && (
                <Text style={styles.venue} numberOfLines={1}>
                  📍 {loc.place}{loc.startTime ? ` · ${formatTime(loc.startTime)}` : ''}
                </Text>
              )}
              {!!loc.address && (
                <Text style={styles.address} numberOfLines={2}>
                  {loc.address}
                </Text>
              )}
            </View>
          );
        })
      ) : (
        <>
          {localEvent.Place ? (
            <Text style={styles.venue} numberOfLines={1}>
              📍 {localEvent.Place}
            </Text>
          ) : null}
          {localEvent.Address ? (
            <Text style={styles.address} numberOfLines={2}>
              {localEvent.Address}
            </Text>
          ) : null}
        </>
      )}

      {/* Phone */}
      {localEvent.Phone && (
        <TouchableOpacity onPress={() => handlePhonePress(localEvent.Phone)}>
          <Text style={styles.phone}>📞 {formatPhoneNumber(localEvent.Phone)}</Text>
        </TouchableOpacity>
      )}

      {/* Date & Time */}
      <Text style={styles.dateTime}>📅 {formatEventDateTime({ ...localEvent, Start: scheduleStart ?? '', End: scheduleEnd ?? '' })}</Text>

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
  activeLocationBlock: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
    marginBottom: theme.spacing.xs,
  },
  locationDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    marginBottom: 2,
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
  continuationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    marginLeft: 36,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  continuationText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.purple,
    fontWeight: theme.fontWeight.semibold,
  },
  recurringBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2D4A6B',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    marginLeft: 36,
    marginBottom: theme.spacing.sm,
  },
  recurringText: {
    fontSize: theme.fontSize.xs,
    color: '#7EB8F7',
    fontWeight: theme.fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  relatedModalContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  relatedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border || '#2A2A2A',
  },
  relatedModalTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  relatedModalClose: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.xs,
  },
  relatedModalSubtitle: {
    fontSize: theme.fontSize.xs,
    color: '#7EB8F7',
    marginTop: 2,
  },
  relatedModalList: {
    paddingVertical: theme.spacing.xs,
  },
  relatedEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border || '#2A2A2A',
  },
  relatedEventIcon: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  relatedEventInfo: {
    flex: 1,
  },
  relatedEventName: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  relatedEventMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  relatedEventChevron: {
    fontSize: 20,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing.sm,
  },
});
