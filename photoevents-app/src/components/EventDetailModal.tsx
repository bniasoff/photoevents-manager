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
import * as Clipboard from 'expo-clipboard';
import { openAddressInNavApp } from '../services/navigationPreference';
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
import { formatEventDateTime, formatTime, formatEventDate } from '../utils/dateHelpers';
import { updateEventStatus, updateEvent, deleteEvent, fetchPlaces } from '../services/api';
import {
  authenticateWithGoogle,
  exportToGoogleCalendar,
  isAuthenticated,
} from '../services/googleCalendarBackendService';

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
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showExportedToast, setShowExportedToast] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Helper functions for date format conversion
  const toAmericanDate = (isoDate: string): string => {
    // Convert YYYY-MM-DD to MM/DD/YYYY
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return isoDate;
  };

  const toISODate = (americanDate: string): string => {
    // Convert MM/DD/YYYY to YYYY-MM-DD
    const parts = americanDate.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    return americanDate;
  };

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
  const [editWeinman, setEditWeinman] = useState(false);
  const [editFeedback, setEditFeedback] = useState('');
  const [editRatings, setEditRatings] = useState<number | null>(null);
  const [editStartHour, setEditStartHour] = useState('');
  const [editStartMin, setEditStartMin] = useState('');
  const [editStartPeriod, setEditStartPeriod] = useState<'AM' | 'PM'>('AM');
  const [editEndHour, setEditEndHour] = useState('');
  const [editEndMin, setEditEndMin] = useState('');
  const [editEndPeriod, setEditEndPeriod] = useState<'AM' | 'PM'>('PM');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isPlaceOpen, setIsPlaceOpen] = useState(false);
  const [newPlaceText, setNewPlaceText] = useState('');
  const [customPlaces, setCustomPlaces] = useState<string[]>([]);
  const [dbPlaces, setDbPlaces] = useState<Record<string, string> | null>(null);

  // Fetch places from database when modal opens
  React.useEffect(() => {
    if (visible) {
      fetchPlaces().then((map) => {
        if (Object.keys(map).length > 0) setDbPlaces(map);
      });
    }
  }, [visible]);

  React.useEffect(() => {
    setLocalEvent(event);
    if (event) {
      const charge = Math.round(parseAmount(event.Charge));
      const payment = Math.round(parseAmount(event.Payment));
      setChargeText(charge > 0 ? charge.toString() : '');
      setPaymentText(payment > 0 ? payment.toString() : '');

      // Initialize edit fields
      setEditName(event.Name || '');
      setEditCategory(event.Category || '');
      setEditPlace(event.Place || '');
      setEditAddress(event.Address || '');
      setEditPhone(event.Phone || '');
      setEditInfo(event.Info || '');
      setEditReferral(event.Referral || '');
      setEditEventDate(event.EventDate ? toAmericanDate(event.EventDate.slice(0, 10)) : '');
      setEditSimchaInitiative(event.SimchaInitiative || false);
      setEditProjector(event.Projector || false);
      setEditWeinman(event.Weinman || false);
      setEditFeedback(event.Feedback || '');
      setEditRatings(event.Ratings || null);

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
    field: 'Paid' | 'Ready' | 'Sent' | 'SimchaInitiative' | 'Projector' | 'Weinman',
    newValue: boolean
  ) => {
    const previousEvent = { ...localEvent };

    console.log(`=== STATUS TOGGLE: ${field} ===`);
    console.log('Event ID:', getEventId(localEvent));
    console.log('Event Name:', localEvent.Name);
    console.log('Old value:', localEvent[field]);
    console.log('New value:', newValue);

    // Optimistic update
    // Handle both string fields (Paid/Ready/Sent) and boolean fields (SimchaInitiative/Projector/Weinman)
    const fieldValue = ['SimchaInitiative', 'Projector', 'Weinman'].includes(field)
      ? newValue
      : newValue ? 'True' : '';
    const optimisticEvent = {
      ...localEvent,
      [field]: fieldValue,
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

  const handleAddressPress = async () => {
    if (localEvent.Address) {
      openAddressInNavApp(localEvent.Address);
    }
  };

  const handleExportToGoogleCalendar = async () => {
    try {
      const authenticated = await isAuthenticated();

      if (!authenticated) {
        Alert.alert(
          'Sign in to Google',
          'To export events to Google Calendar, you need to sign in with your Google account.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign In',
              onPress: async () => {
                setIsSaving(true);
                await authenticateWithGoogle();
                setIsSaving(false);
                Alert.alert('Browser Opened', 'Complete sign-in in your browser, then tap Export again.');
              },
            },
          ]
        );
        return;
      }

      setIsSaving(true);
      const result = await exportToGoogleCalendar(localEvent);
      setIsSaving(false);

      if (result === 'success') {
        setShowExportedToast(true);
        setTimeout(() => setShowExportedToast(false), 3000);
      } else if (result === 'needsReauth') {
        Alert.alert(
          'Google Sign-in Expired',
          'Your Google access has expired (this happens every 7 days in testing mode). Please sign in again.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign In',
              onPress: async () => {
                setIsSaving(true);
                await authenticateWithGoogle();
                setIsSaving(false);
                Alert.alert('Browser Opened', 'Complete sign-in in your browser, then tap Export again.');
              },
            },
          ]
        );
      } else {
        Alert.alert('Export Failed', 'Failed to export event. Please try again.');
      }
    } catch (error) {
      setIsSaving(false);
      console.error('Error exporting to Google Calendar:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleCopyReference = async () => {
    if (!localEvent.Phone) {
      Alert.alert('No Phone Number', 'This event does not have a phone number to copy.');
      return;
    }

    // Format reference: Name - Phone
    const reference = `${localEvent.Name} - ${localEvent.Phone}`;

    try {
      await Clipboard.setStringAsync(reference);
      // Show toast message
      setShowCopiedToast(true);
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowCopiedToast(false);
      }, 3000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy reference to clipboard.');
    }
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
      setEditWeinman(localEvent.Weinman || false);
      setEditFeedback(localEvent.Feedback || '');
      setEditRatings(localEvent.Ratings || null);
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

    // Check if address was changed
    const addressChanged = editAddress.trim() !== (previousEvent.Address || '').trim();
    const hasAddress = editAddress.trim().length > 0;

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
      EventDate: toISODate(editEventDate),
      SimchaInitiative: editSimchaInitiative,
      Projector: editProjector,
      Weinman: editWeinman,
      Feedback: editFeedback.trim() || null,
      Ratings: editRatings,
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
        EventDate: toISODate(editEventDate),
        SimchaInitiative: editSimchaInitiative,
        Projector: editProjector,
        Weinman: editWeinman,
        Feedback: editFeedback.trim() || null,
        Ratings: editRatings,
        Start: startTime,
        End: endTime,
        Charge: parseFloat(chargeText) || 0,
        Payment: parseFloat(paymentText) || 0,
      };

      const updatedEvent = await updateEvent(getEventId(localEvent), updates);
      onUpdate(updatedEvent);
      setLocalEvent(updatedEvent);

      // Show toast message
      setShowSavedToast(true);
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowSavedToast(false);
      }, 3000);
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
          <View>
            <Text style={styles.headerTitle}>Event Details</Text>
            {(localEvent.createdAt || localEvent.CreatedDate) && (
              <Text style={styles.headerSubtitle}>
                Created: {formatEventDate((localEvent.createdAt || localEvent.CreatedDate)!)}
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            {!isEditing && (
              <TouchableOpacity
                onPress={handleCopyReference}
                disabled={isSaving}
                style={styles.copyIconButton}
              >
                <Text style={styles.copyIconText}>📋</Text>
                <Text style={styles.copyIconLabel}>Ref</Text>
              </TouchableOpacity>
            )}
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
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              disabled={isSaving}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Copied Toast Message */}
        {showCopiedToast && (
          <View style={styles.toastContainer}>
            <View style={styles.toast}>
              <Text style={styles.toastText}>✓ Copied to clipboard!</Text>
            </View>
          </View>
        )}

        {/* Exported Toast Message */}
        {showExportedToast && (
          <View style={styles.toastContainer}>
            <View style={styles.toast}>
              <Text style={styles.toastText}>✓ Exported</Text>
            </View>
          </View>
        )}

        {/* Saved Toast Message */}
        {showSavedToast && (
          <View style={styles.toastContainer}>
            <View style={styles.toast}>
              <Text style={styles.toastText}>✓ Saved</Text>
            </View>
          </View>
        )}

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
                <Text style={[styles.sectionTitle, { marginTop: theme.spacing.sm }]}>Date (MM/DD/YYYY)</Text>
                <TextInput
                  style={styles.input}
                  value={editEventDate}
                  onChangeText={setEditEventDate}
                  placeholder="02/01/2026"
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
            <Text style={styles.sectionTitle}>Payment</Text>

            {isEditing ? (
              <>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Charge:</Text>
                  <TextInput
                    style={styles.input}
                    value={chargeText}
                    onChangeText={setChargeText}
                    placeholder=""
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Paid:</Text>
                  <TextInput
                    style={styles.input}
                    value={paymentText}
                    onChangeText={setPaymentText}
                    placeholder=""
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
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone number"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="phone-pad"
              />
            ) : (
              localEvent.Phone && (
                <TouchableOpacity onPress={handlePhonePress}>
                  <Text style={styles.linkText}>
                    📞 {formatPhoneNumber(localEvent.Phone)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Location Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            {isEditing ? (
              <>
                {/* Place Combo Box */}
                <View style={styles.placeComboRow}>
                  <TouchableOpacity
                    style={[styles.comboBox, isPlaceOpen && styles.comboBoxOpen, styles.placeComboFlex]}
                    onPress={() => setIsPlaceOpen(!isPlaceOpen)}
                  >
                    <View style={styles.comboBoxValue}>
                      {editPlace ? (
                        <Text style={styles.comboBoxText}>{editPlace}</Text>
                      ) : (
                        <Text style={styles.comboBoxPlaceholder}>Select a place...</Text>
                      )}
                    </View>
                    <Text style={styles.comboBoxArrow}>{isPlaceOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {editPlace ? (
                    <TouchableOpacity onPress={() => { setEditPlace(''); setEditAddress(''); }}>
                      <Text style={styles.searchClear}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Place Dropdown */}
                {isPlaceOpen && (() => {
                  const effectivePlaces = dbPlaces ? Object.keys(dbPlaces).sort() : [];
                  const effectiveAddresses = dbPlaces || {};
                  const search = newPlaceText.toLowerCase();
                  const allPlaces = [...effectivePlaces, ...customPlaces];
                  const filtered = search
                    ? allPlaces.filter((p) => p.toLowerCase().includes(search))
                    : allPlaces;
                  const canAdd = newPlaceText.trim() && !allPlaces.some((p) => p.toLowerCase() === newPlaceText.trim().toLowerCase());

                  return (
                    <View style={styles.comboBoxDropdown}>
                      <View style={styles.searchRow}>
                        <TextInput
                          style={styles.searchInput}
                          value={newPlaceText}
                          onChangeText={setNewPlaceText}
                          placeholder="Search or add place..."
                          placeholderTextColor={theme.colors.textTertiary}
                          returnKeyType="done"
                          onSubmitEditing={() => {
                            if (canAdd) {
                              setCustomPlaces((prev) => [...prev, newPlaceText.trim()]);
                              setEditPlace(newPlaceText.trim());
                              setNewPlaceText('');
                              setIsPlaceOpen(false);
                            }
                          }}
                        />
                        {newPlaceText ? (
                          <TouchableOpacity onPress={() => setNewPlaceText('')}>
                            <Text style={styles.searchClear}>✕</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <ScrollView
                        style={styles.comboBoxList}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        {filtered.map((p) => (
                          <TouchableOpacity
                            key={p}
                            style={[styles.comboBoxItem, editPlace === p && styles.comboBoxItemActive]}
                            onPress={() => {
                              setEditPlace(p);
                              if (effectiveAddresses[p]) setEditAddress(effectiveAddresses[p]);
                              setNewPlaceText('');
                              setIsPlaceOpen(false);
                            }}
                          >
                            <Text style={[styles.comboBoxItemText, editPlace === p && styles.comboBoxItemTextActive]}>
                              {p}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        {canAdd && (
                          <TouchableOpacity
                            style={styles.comboBoxItem}
                            onPress={() => {
                              setCustomPlaces((prev) => [...prev, newPlaceText.trim()]);
                              setEditPlace(newPlaceText.trim());
                              setNewPlaceText('');
                              setIsPlaceOpen(false);
                            }}
                          >
                            <Text style={styles.addNewPlaceText}>+ Add "{newPlaceText.trim()}"</Text>
                          </TouchableOpacity>
                        )}
                        {filtered.length === 0 && !canAdd && (
                          <View style={styles.comboBoxItem}>
                            <Text style={styles.comboBoxItemText}>No matches</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  );
                })()}

                {/* Address Input */}
                <TextInput
                  style={[styles.input, { marginLeft: 0, marginTop: theme.spacing.sm }]}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Address"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </>
            ) : (
              <>
                {localEvent.Place && (
                  <Text style={styles.infoText}>📍 {localEvent.Place}</Text>
                )}
                {localEvent.Address && (
                  <TouchableOpacity onPress={handleAddressPress}>
                    <Text style={styles.linkText}>{localEvent.Address}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            {isEditing ? (
              <>
                <Text style={styles.timeLabel}>Start Time</Text>
                <View style={styles.timeRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={editStartHour}
                    onChangeText={setEditStartHour}
                    placeholder="HH"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={styles.timeSeparator}>:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={editStartMin}
                    onChangeText={setEditStartMin}
                    placeholder="MM"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <TouchableOpacity
                    style={styles.periodButton}
                    onPress={() => setEditStartPeriod(editStartPeriod === 'AM' ? 'PM' : 'AM')}
                  >
                    <Text style={styles.periodButtonText}>{editStartPeriod}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.timeLabel}>End Time</Text>
                <View style={styles.timeRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={editEndHour}
                    onChangeText={setEditEndHour}
                    placeholder="HH"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={styles.timeSeparator}>:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={editEndMin}
                    onChangeText={setEditEndMin}
                    placeholder="MM"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <TouchableOpacity
                    style={styles.periodButton}
                    onPress={() => setEditEndPeriod(editEndPeriod === 'AM' ? 'PM' : 'AM')}
                  >
                    <Text style={styles.periodButtonText}>{editEndPeriod}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.infoText}>
                  📅 {formatEventDateTime(localEvent)}
                </Text>
                {localEvent.End && (() => {
                  const [sh, sm] = localEvent.Start.split(':').map(Number);
                  const [eh, em] = localEvent.End.split(':').map(Number);
                  const totalMins = (eh * 60 + em) - (sh * 60 + sm);
                  const hrs = Math.floor(totalMins / 60);
                  const mins = totalMins % 60;
                  const duration = hrs > 0 && mins > 0 ? `${hrs}h ${mins}m` : hrs > 0 ? `${hrs}h` : `${mins}m`;
                  return (
                    <Text style={styles.infoText}>
                      ⏱️ {formatTime(localEvent.Start)} - {formatTime(localEvent.End)}{'  •  '}{duration}
                    </Text>
                  );
                })()}
              </>
            )}

            {/* Separator */}
            <View style={styles.separator} />

            {/* Event Options */}
            <View style={styles.eventOptionsContainer}>
              <View style={styles.eventOption}>
                <Text style={styles.eventOptionText}>Simcha Initiative</Text>
                <Switch
                  value={localEvent.SimchaInitiative || false}
                  onValueChange={(value) => handleStatusToggle('SimchaInitiative', value)}
                  disabled={isSaving}
                  trackColor={{
                    false: '#ef4444', // Red when false
                    true: '#22c55e', // Green when true
                  }}
                  thumbColor={theme.colors.textPrimary}
                />
              </View>

              <View style={styles.eventOption}>
                <Text style={styles.eventOptionText}>Projector</Text>
                <Switch
                  value={localEvent.Projector || false}
                  onValueChange={(value) => handleStatusToggle('Projector', value)}
                  disabled={isSaving}
                  trackColor={{
                    false: '#ef4444', // Red when false
                    true: '#22c55e', // Green when true
                  }}
                  thumbColor={theme.colors.textPrimary}
                />
              </View>

              <View style={styles.eventOption}>
                <Text style={styles.eventOptionText}>Weinman</Text>
                <Switch
                  value={localEvent.Weinman || false}
                  onValueChange={(value) => handleStatusToggle('Weinman', value)}
                  disabled={isSaving}
                  trackColor={{
                    false: '#ef4444', // Red when false
                    true: '#22c55e', // Green when true
                  }}
                  thumbColor={theme.colors.textPrimary}
                />
              </View>
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

          {/* Feedback */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Feedback</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.feedbackInput]}
                value={editFeedback}
                onChangeText={setEditFeedback}
                placeholder="Client feedback..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                textAlignVertical="top"
              />
            ) : (
              localEvent.Feedback ? (
                <Text style={styles.infoText}>{localEvent.Feedback}</Text>
              ) : (
                <Text style={[styles.infoText, styles.placeholderText]}>No feedback yet</Text>
              )
            )}
          </View>

          {/* Ratings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rating</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => isEditing && setEditRatings(star)}
                  disabled={!isEditing}
                >
                  <Text style={styles.star}>
                    {(isEditing ? editRatings : localEvent.Ratings) && star <= (isEditing ? editRatings! : localEvent.Ratings!)
                      ? '⭐'
                      : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
              {isEditing && editRatings && (
                <TouchableOpacity onPress={() => setEditRatings(null)} style={styles.clearRatingBtn}>
                  <Text style={styles.clearRatingText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            {!isEditing && !localEvent.Ratings && (
              <Text style={[styles.infoText, styles.placeholderText]}>No rating yet</Text>
            )}
          </View>

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
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  closeButtonText: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  copyIconButton: {
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyIconText: {
    fontSize: 18,
    marginBottom: 2,
  },
  copyIconLabel: {
    fontSize: 9,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
  },
  toastContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    backgroundColor: '#22c55e',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
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
  eventOptionsContainer: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  eventOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  eventOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
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
  separator: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  timeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    fontWeight: theme.fontWeight.medium,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  timeInput: {
    width: 50,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontWeight: theme.fontWeight.semibold,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeSeparator: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.textPrimary,
    marginHorizontal: theme.spacing.xs,
    fontWeight: theme.fontWeight.bold,
  },
  periodButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginLeft: theme.spacing.md,
  },
  periodButtonText: {
    fontSize: theme.fontSize.md,
    color: '#FFFFFF',
    fontWeight: theme.fontWeight.bold,
  },
  // Place combo box styles
  placeComboRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  placeComboFlex: {
    flex: 1,
  },
  comboBox: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comboBoxOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  comboBoxValue: {
    flex: 1,
  },
  comboBoxText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  comboBoxPlaceholder: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textTertiary,
  },
  comboBoxArrow: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  comboBoxDropdown: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
    maxHeight: 200,
  },
  comboBoxList: {
    maxHeight: 150,
  },
  comboBoxItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.divider,
  },
  comboBoxItemActive: {
    backgroundColor: theme.colors.primary + '20',
  },
  comboBoxItemText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  comboBoxItemTextActive: {
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.xs,
  },
  searchClear: {
    fontSize: 18,
    color: theme.colors.textTertiary,
    paddingHorizontal: 4,
  },
  addNewPlaceText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  feedbackInput: {
    minHeight: 100,
    paddingTop: theme.spacing.sm,
    textAlign: 'left',
    marginLeft: 0,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  star: {
    fontSize: 32,
    paddingHorizontal: theme.spacing.xs,
  },
  clearRatingBtn: {
    marginLeft: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  clearRatingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
  placeholderText: {
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
});
