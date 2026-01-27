import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Event } from '../types/Event';
import { theme } from '../theme/theme';
import {
  getCategoryIcon,
  formatPhoneNumber,
  getEventStatus,
  parseAmount,
} from '../utils/eventHelpers';
import { formatEventDateTime } from '../utils/dateHelpers';
import { updateEventStatus } from '../services/api';

interface EventDetailModalProps {
  event: Event | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (updatedEvent: Event) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  visible,
  onClose,
  onUpdate,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [localEvent, setLocalEvent] = useState<Event | null>(event);

  React.useEffect(() => {
    setLocalEvent(event);
  }, [event]);

  if (!event || !localEvent) return null;

  const status = getEventStatus(localEvent);
  const icon = getCategoryIcon(localEvent.Category);
  const charge = parseAmount(localEvent.Charge);
  const payment = parseAmount(localEvent.Payment);
  const balance = charge - payment;

  const handleStatusToggle = async (
    field: 'Paid' | 'Ready' | 'Sent',
    newValue: boolean
  ) => {
    const previousEvent = { ...localEvent };

    // Optimistic update
    const optimisticEvent = {
      ...localEvent,
      [field]: newValue ? 'True' : '',
    };
    setLocalEvent(optimisticEvent);

    try {
      setIsSaving(true);

      // Update via API
      const updates = { [field]: newValue };
      const updatedEvent = await updateEventStatus(localEvent._id, updates);

      // Update parent component
      onUpdate(updatedEvent);
      setLocalEvent(updatedEvent);

      Alert.alert('Success', `Event status updated successfully`);
    } catch (error) {
      // Revert on error
      setLocalEvent(previousEvent);
      Alert.alert(
        'Error',
        'Failed to update event. Please try again.',
        [{ text: 'OK' }]
      );
      console.error('Error updating event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhonePress = () => {
    if (localEvent.Phone) {
      Linking.openURL(`tel:${localEvent.Phone.replace(/\D/g, '')}`);
    }
  };

  const handleAddressPress = () => {
    if (localEvent.Address) {
      const query = encodeURIComponent(localEvent.Address);
      Linking.openURL(`https://maps.google.com/?q=${query}`);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Event Details</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            disabled={isSaving}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Icon & Name */}
          <View style={styles.section}>
            <View style={styles.nameRow}>
              <Text style={styles.icon}>{icon}</Text>
              <Text style={styles.name}>{localEvent.Name}</Text>
            </View>
            <Text style={styles.category}>{localEvent.Category}</Text>
          </View>

          {/* Location Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            {localEvent.Place && (
              <Text style={styles.infoText}>📍 {localEvent.Place}</Text>
            )}
            {localEvent.Address && (
              <TouchableOpacity onPress={handleAddressPress}>
                <Text style={styles.linkText}>{localEvent.Address}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            {localEvent.Phone && (
              <TouchableOpacity onPress={handlePhonePress}>
                <Text style={styles.linkText}>
                  📞 {formatPhoneNumber(localEvent.Phone)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <Text style={styles.infoText}>
              📅 {formatEventDateTime(localEvent)}
            </Text>
            {localEvent.End && (
              <Text style={styles.infoText}>
                ⏱️ {localEvent.Start} - {localEvent.End}
              </Text>
            )}
          </View>

          {/* Financial */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <View style={styles.financialRow}>
              <Text style={styles.infoText}>Charge:</Text>
              <Text style={styles.amount}>${charge.toFixed(2)}</Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={styles.infoText}>Paid:</Text>
              <Text style={styles.amount}>${payment.toFixed(2)}</Text>
            </View>
            {balance > 0 && (
              <View style={styles.financialRow}>
                <Text style={styles.infoText}>Balance:</Text>
                <Text style={[styles.amount, styles.balanceText]}>
                  ${balance.toFixed(2)}
                </Text>
              </View>
            )}
          </View>

          {/* Status Toggles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>

            {/* Paid Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabel}>
                <Text style={styles.toggleIcon}>💰</Text>
                <Text style={styles.toggleText}>Paid</Text>
              </View>
              <Switch
                value={status.isPaid}
                onValueChange={(value) => handleStatusToggle('Paid', value)}
                disabled={isSaving}
                trackColor={{
                  false: theme.colors.disabled,
                  true: theme.statusColors.paid,
                }}
                thumbColor={theme.colors.textPrimary}
              />
            </View>

            {/* Ready Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabel}>
                <Text style={styles.toggleIcon}>⏳</Text>
                <Text style={styles.toggleText}>Ready</Text>
              </View>
              <Switch
                value={status.isReady}
                onValueChange={(value) => handleStatusToggle('Ready', value)}
                disabled={isSaving}
                trackColor={{
                  false: theme.colors.disabled,
                  true: theme.statusColors.ready,
                }}
                thumbColor={theme.colors.textPrimary}
              />
            </View>

            {/* Sent Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabel}>
                <Text style={styles.toggleIcon}>📤</Text>
                <Text style={styles.toggleText}>Sent</Text>
              </View>
              <Switch
                value={status.isSent}
                onValueChange={(value) => handleStatusToggle('Sent', value)}
                disabled={isSaving}
                trackColor={{
                  false: theme.colors.disabled,
                  true: theme.statusColors.sent,
                }}
                thumbColor={theme.colors.textPrimary}
              />
            </View>
          </View>

          {/* Additional Info */}
          {localEvent.Info && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.infoText}>{localEvent.Info}</Text>
            </View>
          )}

          {/* Referral */}
          {localEvent.Referral && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Referral</Text>
              <Text style={styles.infoText}>{localEvent.Referral}</Text>
            </View>
          )}

          {/* Saving Indicator */}
          {isSaving && (
            <View style={styles.savingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.savingText}>Saving changes...</Text>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  closeButtonText: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  icon: {
    fontSize: 48,
    marginRight: theme.spacing.md,
  },
  name: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  category: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginLeft: 60,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    lineHeight: 22,
  },
  linkText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
    textDecorationLine: 'underline',
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  amount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  balanceText: {
    color: theme.colors.error,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleIcon: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  toggleText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  savingText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  bottomPadding: {
    height: theme.spacing.xxl,
  },
});
