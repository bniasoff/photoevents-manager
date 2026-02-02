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
  TextInput,
} from 'react-native';
import { Event } from '../types/Event';
import { theme } from '../theme/theme';
import {
  getCategoryIcon,
  formatPhoneNumber,
  getEventStatus,
  parseAmount,
  parseBoolean,
  getEventId,
} from '../utils/eventHelpers';
import { formatEventDateTime, formatTime } from '../utils/dateHelpers';
import { updateEventStatus, updateEvent, deleteEvent } from '../services/api';

interface EventDetailModalProps {
  event: Event | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (updatedEvent: Event) => void;
  onDelete: (eventId: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  visible,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [localEvent, setLocalEvent] = useState<Event | null>(event);
  const [chargeText, setChargeText] = useState('');
  const [paymentText, setPaymentText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Edit mode state fields
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPlace, setEditPlace] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editInfo, setEditInfo] = useState('');
  const [editReferral, setEditReferral] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editSimchaInitiative, setEditSimchaInitiative] = useState(false);
  const [editProjector, setEditProjector] = useState(false);
  const [editWineman, setEditWineman] = useState(false);
  const [editStartHour, setEditStartHour] = useState('');
  const [editStartMin, setEditStartMin] = useState('');
  const [editStartPeriod, setEditStartPeriod] = useState<'AM' | 'PM'>('AM');
  const [editEndHour, setEditEndHour] = useState('');
  const [editEndMin, setEditEndMin] = useState('');
  const [editEndPeriod, setEditEndPeriod] = useState<'AM' | 'PM'>('PM');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isPlaceOpen, setIsPlaceOpen] = useState(false);

  React.useEffect(() => {
    setLocalEvent(event);
    if (event) {
      setChargeText(Math.round(parseAmount(event.Charge)).toString());
      setPaymentText(Math.round(parseAmount(event.Payment)).toString());

      // Initialize edit fields
      setEditName(event.Name || '');
      setEditCategory(event.Category || '');
      setEditPlace(event.Place || '');
      setEditAddress(event.Address || '');
      setEditPhone(event.Phone || '');
      setEditInfo(event.Info || '');
      setEditReferral(event.Referral || '');
      setEditEventDate(event.EventDate ? event.EventDate.slice(0, 10) : '');
      setEditSimchaInitiative(event.SimchaInitiative || false);
      setEditProjector(event.Projector || false);
      setEditWineman(event.Wineman || false);

      // Parse Start time
      if (event.Start) {
        const [hour, min] = event.Start.split(':');
        const h = parseInt(hour);
        const isPM = h >= 12;
        setEditStartHour((h % 12 || 12).toString());
        setEditStartMin(min);
        setEditStartPeriod(isPM ? 'PM' : 'AM');
      } else {
        setEditStartHour('');
        setEditStartMin('');
        setEditStartPeriod('AM');
      }

      // Parse End time
      if (event.End) {
        const [hour, min] = event.End.split(':');
        const h = parseInt(hour);
        const isPM = h >= 12;
        setEditEndHour((h % 12 || 12).toString());
        setEditEndMin(min);
        setEditEndPeriod(isPM ? 'PM' : 'AM');
      } else {
        setEditEndHour('');
        setEditEndMin('');
        setEditEndPeriod('PM');
      }
    }
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

    console.log(`=== STATUS TOGGLE: ${field} ===`);
    console.log('Event ID:', getEventId(localEvent));
    console.log('Event Name:', localEvent.Name);
    console.log('Old value:', localEvent[field]);
    console.log('New value:', newValue);

    // Optimistic update
    const optimisticEvent = {
      ...localEvent,
      [field]: newValue ? 'True' : '',
    };
    setLocalEvent(optimisticEvent);

    try {
      setIsSaving(true);

      // Update via API - same for all fields
      const updates: { [key: string]: boolean } = { [field]: newValue };
      const updatedEvent = await updateEventStatus(getEventId(localEvent), updates);

      // Update with whatever the server returned - trust the server completely
      onUpdate(updatedEvent);
      setLocalEvent(updatedEvent);

      // Silent success - toggle color change is enough feedback
    } catch (error) {
      // Revert on error
      setLocalEvent(previousEvent);
      Alert.alert(
        'Error',
        `Failed to update ${field} status. Please try again.`,
        [{ text: 'OK' }]
      );
      console.error(`Error updating ${field}:`, error);
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

  const handleExportToGoogleCalendar = () => {
    const dateStr = localEvent.EventDate.slice(0, 10).replace(/-/g, '');

    let dates: string;
    if (localEvent.Start) {
      const startTime = localEvent.Start.replace(/:/g, '').slice(0, 6);
      let endTime: string;
      if (localEvent.End) {
        endTime = localEvent.End.replace(/:/g, '').slice(0, 6);
      } else {
        const [sh, sm, ss] = localEvent.Start.split(':');
        const endH = (parseInt(sh, 10) + 1).toString().padStart(2, '0');
        endTime = `${endH}${sm}${ss || '00'}`;
      }
      dates = `${dateStr}T${startTime}/${dateStr}T${endTime}`;
    } else {
      const nextDay = new Date(new Date(localEvent.EventDate).getTime() + 86400000);
      const nextDayStr = nextDay.toISOString().slice(0, 10).replace(/-/g, '');
      dates = `${dateStr}/${nextDayStr}`;
    }

    let url = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(localEvent.Name)}&dates=${dates}`;

    if (localEvent.Place || localEvent.Address) {
      let location = localEvent.Place || '';
      if (localEvent.Address) location += (location ? ', ' : '') + localEvent.Address;
      url += `&location=${encodeURIComponent(location)}`;
    }
    if (localEvent.Info) {
      url += `&details=${encodeURIComponent(localEvent.Info)}`;
    }

    Linking.openURL(url);
  };

  const handleFinancialUpdate = async () => {
    const previousEvent = { ...localEvent };
    const newCharge = parseFloat(chargeText) || 0;
    const newPayment = parseFloat(paymentText) || 0;

    console.log('=== PAYMENT UPDATE START ===');
    console.log('Event ID:', getEventId(localEvent));
    console.log('Event Name:', localEvent.Name);
    console.log('OLD values - Charge:', localEvent.Charge, 'Payment:', localEvent.Payment);
    console.log('NEW values - Charge:', newCharge, 'Payment:', newPayment);
    console.log('Input text - chargeText:', chargeText, 'paymentText:', paymentText);

    // Optimistic update
    const optimisticEvent = {
      ...localEvent,
      Charge: newCharge,
      Payment: newPayment,
    };
    setLocalEvent(optimisticEvent);
    setIsEditing(false);

    try {
      setIsSaving(true);

      // Update via API
      const updates = {
        Charge: newCharge,
        Payment: newPayment,
      };
      console.log('Calling updateEventStatus with:', updates);
      const updatedEvent = await updateEventStatus(getEventId(localEvent), updates);

      // Update parent component
      console.log('=== SERVER RESPONSE ===');
      console.log('Updated Charge from server:', updatedEvent.Charge);
      console.log('Updated Payment from server:', updatedEvent.Payment);
      console.log('Full updated event:', JSON.stringify(updatedEvent, null, 2));

      onUpdate(updatedEvent);
      setLocalEvent(updatedEvent);
      setChargeText(Math.round(parseAmount(updatedEvent.Charge)).toString());
      setPaymentText(Math.round(parseAmount(updatedEvent.Payment)).toString());

      console.log('=== PAYMENT UPDATE COMPLETE ===');
      // Silent success - field update is enough feedback
    } catch (error) {
      // Revert on error
      console.error('Error updating financials:', error);
      setLocalEvent(previousEvent);
      setChargeText(Math.round(parseAmount(previousEvent.Charge)).toString());
      setPaymentText(Math.round(parseAmount(previousEvent.Payment)).toString());
      Alert.alert(
        'Error',
        'Failed to update payment information. Please try again.',
        [{ text: 'OK' }]
      );
      console.error('Full error details:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!localEvent) return;

    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${localEvent.Name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              await deleteEvent(getEventId(localEvent));
              onDelete(getEventId(localEvent));
              onClose();
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to delete event. Please try again.',
                [{ text: 'OK' }]
              );
              console.error('Error deleting event:', error);
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (localEvent) {
      // Reset all edit fields to current values
      setEditName(localEvent.Name || '');
      setEditCategory(localEvent.Category || '');
      setEditPlace(localEvent.Place || '');
      setEditAddress(localEvent.Address || '');
      setEditPhone(localEvent.Phone || '');
      setEditInfo(localEvent.Info || '');
      setEditReferral(localEvent.Referral || '');
      setEditEventDate(localEvent.EventDate ? localEvent.EventDate.slice(0, 10) : '');
      setEditSimchaInitiative(localEvent.SimchaInitiative || false);
      setEditProjector(localEvent.Projector || false);
      setEditWineman(localEvent.Wineman || false);
      setChargeText(Math.round(parseAmount(localEvent.Charge)).toString());
      setPaymentText(Math.round(parseAmount(localEvent.Payment)).toString());

      // Reset time fields
      if (localEvent.Start) {
        const [hour, min] = localEvent.Start.split(':');
        const h = parseInt(hour);
        const isPM = h >= 12;
        setEditStartHour((h % 12 || 12).toString());
        setEditStartMin(min);
        setEditStartPeriod(isPM ? 'PM' : 'AM');
      }
      if (localEvent.End) {
        const [hour, min] = localEvent.End.split(':');
        const h = parseInt(hour);
        const isPM = h >= 12;
        setEditEndHour((h % 12 || 12).toString());
        setEditEndMin(min);
        setEditEndPeriod(isPM ? 'PM' : 'AM');
      }
    }
  };

  const handleFullEdit = async () => {
    if (!localEvent) return;

    const previousEvent = { ...localEvent };

    // Convert time to 24-hour format
    const to24Hour = (hour: string, minute: string, period: 'AM' | 'PM'): string => {
      let h = parseInt(hour) || 0;
      const m = parseInt(minute) || 0;
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
    };

    const startTime = editStartHour ? to24Hour(editStartHour, editStartMin, editStartPeriod) : '';
    const endTime = editEndHour ? to24Hour(editEndHour, editEndMin, editEndPeriod) : '';

    // Optimistic update
    const optimisticEvent = {
      ...localEvent,
      Name: editName.trim(),
      Category: editCategory,
      Place: editPlace.trim(),
      Address: editAddress.trim(),
      Phone: editPhone.trim(),
      Info: editInfo.trim(),
      Referral: editReferral.trim() || null,
      EventDate: editEventDate,
      SimchaInitiative: editSimchaInitiative,
      Projector: editProjector,
      Wineman: editWineman,
      Start: startTime,
      End: endTime,
      Charge: parseFloat(chargeText) || 0,
      Payment: parseFloat(paymentText) || 0,
    };

    setLocalEvent(optimisticEvent);
    setIsEditing(false);

    try {
      setIsSaving(true);

      const updates = {
        Name: editName.trim(),
        Category: editCategory,
        Place: editPlace.trim(),
        Address: editAddress.trim(),
        Phone: editPhone.trim(),
        Info: editInfo.trim(),
        Referral: editReferral.trim() || null,
        EventDate: editEventDate,
        SimchaInitiative: editSimchaInitiative,
        Projector: editProjector,
        Wineman: editWineman,
        Start: startTime,
        End: endTime,
        Charge: parseFloat(chargeText) || 0,
        Payment: parseFloat(paymentText) || 0,
      };

      const updatedEvent = await updateEvent(getEventId(localEvent), updates);
      onUpdate(updatedEvent);
      setLocalEvent(updatedEvent);
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
            {isEditing ? (
              <>
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Event name"
                  placeholderTextColor={theme.colors.textTertiary}
                />
                <Text style={[styles.sectionTitle, { marginTop: theme.spacing.sm }]}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={editEventDate}
                  onChangeText={setEditEventDate}
                  placeholder="2026-02-01"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </>
            ) : (
              <>
                <View style={styles.nameRow}>
                  <Text style={styles.icon}>{icon}</Text>
                  <Text style={styles.name}>{localEvent.Name}</Text>
                </View>
                <Text style={styles.category}>{localEvent.Category}</Text>
              </>
            )}
          </View>

          {/* Status Toggles */}
          <View style={styles.statusSection}>
            <Text style={styles.statusTitle}>Status</Text>

            <View style={styles.compactTogglesContainer}>
              {/* Paid Toggle */}
              <View style={styles.compactToggle}>
                <Text style={styles.compactToggleIcon}>💰</Text>
                <Text style={styles.compactToggleText}>Paid</Text>
                <Switch
                  value={status.isPaid}
                  onValueChange={(value) => handleStatusToggle('Paid', value)}
                  disabled={isSaving}
                  trackColor={{
                    false: '#ef4444', // Red when not paid
                    true: '#22c55e', // Green when paid
                  }}
                  thumbColor={theme.colors.textPrimary}
                />
              </View>

              {/* Ready Toggle */}
              <View style={styles.compactToggle}>
                <Text style={styles.compactToggleIcon}>⏳</Text>
                <Text style={styles.compactToggleText}>Ready</Text>
                <Switch
                  value={status.isReady}
                  onValueChange={(value) => handleStatusToggle('Ready', value)}
                  disabled={isSaving}
                  trackColor={{
                    false: '#ef4444', // Red when not ready
                    true: '#22c55e', // Green when ready
                  }}
                  thumbColor={theme.colors.textPrimary}
                />
              </View>

              {/* Sent Toggle */}
              <View style={styles.compactToggle}>
                <Text style={styles.compactToggleIcon}>📤</Text>
                <Text style={styles.compactToggleText}>Sent</Text>
                <Switch
                  value={status.isSent}
                  onValueChange={(value) => handleStatusToggle('Sent', value)}
                  disabled={isSaving}
                  trackColor={{
                    false: '#ef4444', // Red when not sent
                    true: '#22c55e', // Green when sent
                  }}
                  thumbColor={theme.colors.textPrimary}
                />
              </View>
            </View>
          </View>

          {/* Financial */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payment</Text>
              {!isEditing ? (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  disabled={isSaving}
                >
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    onPress={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelButton}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleFullEdit}
                    disabled={isSaving}
                    style={styles.saveButtonContainer}
                  >
                    <Text style={styles.saveButton}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {isEditing ? (
              <>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Charge:</Text>
                  <TextInput
                    style={styles.input}
                    value={chargeText}
                    onChangeText={setChargeText}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Paid:</Text>
                  <TextInput
                    style={styles.input}
                    value={paymentText}
                    onChangeText={setPaymentText}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.financialRow}>
                  <Text style={styles.infoText}>Charge:</Text>
                  <Text style={styles.amount}>${Math.round(charge)}</Text>
                </View>
                <View style={styles.financialRow}>
                  <Text style={styles.infoText}>Paid:</Text>
                  <Text style={styles.amount}>${Math.round(payment)}</Text>
                </View>
              </>
            )}

            {balance > 0 && !isEditing && (
              <View style={styles.financialRow}>
                <Text style={styles.infoText}>Balance:</Text>
                <Text style={[styles.amount, styles.balanceText]}>
                  ${Math.round(balance)}
                </Text>
              </View>
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

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <Text style={styles.infoText}>
              📅 {formatEventDateTime(localEvent)}
            </Text>
            {localEvent.End && (
              <Text style={styles.infoText}>
                ⏱️ {formatTime(localEvent.Start)} - {formatTime(localEvent.End)}
              </Text>
            )}
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

          {/* Export to Google Calendar */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.googleCalendarBtn} onPress={handleExportToGoogleCalendar}>
              <Text style={styles.googleCalendarBtnText}>📅  Export to Google Calendar</Text>
            </TouchableOpacity>
          </View>

          {/* Saving Indicator */}
          {isSaving && (
            <View style={styles.savingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.savingText}>Saving changes...</Text>
            </View>
          )}

          {/* Delete Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isSaving}
            >
              <Text style={styles.deleteButtonText}>Delete Event</Text>
            </TouchableOpacity>
          </View>

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
  statusSection: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  statusTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  editButton: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  editActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  cancelButton: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
  },
  saveButtonContainer: {
    marginLeft: theme.spacing.md,
  },
  saveButton: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  input: {
    flex: 1,
    marginLeft: theme.spacing.md,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
    textAlign: 'right',
    fontWeight: theme.fontWeight.semibold,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nameInput: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'left',
    marginLeft: 0,
    marginBottom: theme.spacing.md,
  },
  compactTogglesContainer: {
    gap: 0,
  },
  compactToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  compactToggleIcon: {
    fontSize: 16,
    marginRight: theme.spacing.xs,
  },
  compactToggleText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
    flex: 1,
  },
  googleCalendarBtn: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  googleCalendarBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  deleteButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#FFFFFF',
  },
});
