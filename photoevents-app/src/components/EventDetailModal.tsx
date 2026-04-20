import React, { useState } from 'react';
import { Calendar } from 'react-native-calendars';
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
import { Event, EventLocation } from '../types/Event';
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
import { updateEventStatus, updateEvent, deleteEvent, fetchPlaces, saveEventLocations, savePlace } from '../services/api';
import { getUserLocationPreference, getReminderEnabled, getReminderMinutes } from '../services/navigationPreference';
import { schedulePreEventReminder } from '../services/notificationService';
import {
  authenticateWithGoogle,
  exportToGoogleCalendar,
  isAuthenticated,
} from '../services/googleCalendarBackendService';

interface EditLocRow {
  id?: string;
  place: string;
  address: string;
  eventDate: string;       // MM/DD/YYYY (display format) or ''
  startHour: string;
  startMin: string;
  startPeriod: 'AM' | 'PM';
  endHour: string;
  endMin: string;
  endPeriod: 'AM' | 'PM';
  placeSearch: string;
  isHouse?: boolean;
}

const parseTime24 = (t: string): { hour: string; min: string; period: 'AM' | 'PM' } => {
  if (!t) return { hour: '', min: '', period: 'AM' };
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr) || 0;
  return { hour: (h % 12 || 12).toString(), min: mStr || '00', period: h >= 12 ? 'PM' : 'AM' };
};

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
  const [savedToastText, setSavedToastText] = useState('✓ Saved');

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
  const [editLocations, setEditLocations] = useState<EditLocRow[]>([]);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editPhone2, setEditPhone2] = useState('');
  const [editPhone3, setEditPhone3] = useState('');
  const [phoneCount, setPhoneCount] = useState(1);
  const [editInfo, setEditInfo] = useState('');
  const [editReferral, setEditReferral] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editSimchaInitiative, setEditSimchaInitiative] = useState(false);
  const [editProjector, setEditProjector] = useState(false);
  const [editWeinman, setEditWeinman] = useState(false);
  const [editFeedback, setEditFeedback] = useState('');
  const [editRatings, setEditRatings] = useState<number | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [customPlaces, setCustomPlaces] = useState<string[]>([]);
  const [dbPlaces, setDbPlaces] = useState<Record<string, string> | null>(null);
  const [userRegion, setUserRegion] = useState<string>('lakewood');
  const [datePickerLocIdx, setDatePickerLocIdx] = useState<number | null>(null);
  const [showMainDatePicker, setShowMainDatePicker] = useState(false);

  // Fetch places from database when modal opens
  React.useEffect(() => {
    if (visible) {
      getUserLocationPreference().then((region) => {
        setUserRegion(region);
        fetchPlaces(region).then((map) => {
          setDbPlaces(map); // always set — even empty — so non-Lakewood regions don't fall back
        });
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
      setEditPhone(event.Phone || '');
      setEditPhone2(event.Phone2 || '');
      setEditPhone3(event.Phone3 || '');
      setPhoneCount(event.Phone3 ? 3 : event.Phone2 ? 2 : 1);
      setEditInfo(event.Info || '');
      setEditReferral(event.Referral || '');
      setEditEventDate(event.EventDate ? toAmericanDate(event.EventDate.slice(0, 10)) : '');
      setEditSimchaInitiative(event.SimchaInitiative || false);
      setEditProjector(event.Projector || false);
      setEditWeinman(event.Weinman || false);
      setEditFeedback(event.Feedback || '');
      setEditRatings(event.Ratings || null);

      // Initialize location rows from locations array (or fall back to old fields)
      if (event.locations && event.locations.length > 0) {
        const primaryAmericanDate = event.EventDate ? toAmericanDate(event.EventDate.slice(0, 10)) : '';
        setEditLocations(event.locations.map((loc) => {
          const s = parseTime24(loc.startTime);
          const e = parseTime24(loc.endTime);
          return {
            id: loc.id, place: loc.place, address: loc.address,
            eventDate: loc.eventDate ? toAmericanDate(loc.eventDate) : primaryAmericanDate,
            startHour: s.hour, startMin: s.min, startPeriod: s.period,
            endHour: e.hour, endMin: e.min, endPeriod: e.period,
            placeSearch: '',
            isHouse: loc.place === 'Private Home',
          };
        }));
      } else {
        const s = parseTime24(event.Start);
        const e = parseTime24(event.End);
        setEditLocations([{
          place: event.Place || '', address: event.Address || '',
          eventDate: event.EventDate ? toAmericanDate(event.EventDate.slice(0, 10)) : '',
          startHour: s.hour, startMin: s.min, startPeriod: s.period,
          endHour: e.hour, endMin: e.min, endPeriod: e.period,
          placeSearch: '',
        }]);
      }
    }
  }, [event]);

  if (!event || !localEvent) return null;

  const CATEGORIES: string[] = [
    'Bar Mitzvah', 'Bat Mitzvah', 'Vort', 'Bris', 'Pidyon Haben', 'School',
    'Photoshoot', 'Wedding', 'CM', 'Parlor Meeting', 'Siyum', "L'Chaim",
    'Advertisements', 'Beis Medrash', 'Birthday', 'Chanukas Habayis',
    'Chumesh Mesiba', 'Chumesh Party', 'Conference', 'Dinner', 'Even Hapina',
    'Hachnosas Sefer Torah', 'Kollel', 'Melava Malka', 'Opsherin', 'Presentation',
    'Seudas Hodah', 'Sheva Brachos', 'Shiur', 'Vachtnact', 'Yeshiva', 'Yorzeit',
  ];

  const status = getEventStatus(localEvent);
  const icon = getCategoryIcon(localEvent.Category);
  const charge = parseAmount(localEvent.Charge);
  const payment = parseAmount(localEvent.Payment);
  const balance = charge - payment;

  // When this is a continuation occurrence, EventDate has been overridden to the continuation date.
  // Use it to find the matching location so we can show the right schedule + highlight.
  const viewDate = localEvent.EventDate?.slice(0, 10) ?? '';
  const activeLoc = localEvent._isContinuation
    ? (localEvent.locations ?? []).find((loc) => loc.eventDate === viewDate) ?? null
    : (localEvent.locations ?? [])[0] ?? null;
  const scheduleStart = (localEvent._isContinuation && activeLoc?.startTime) ? activeLoc.startTime : localEvent.Start;
  const scheduleEnd   = (localEvent._isContinuation && activeLoc?.endTime)   ? activeLoc.endTime   : localEvent.End;

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
      const existingCalId = localEvent.CalendarEventId || undefined;
      const { result, calendarEventId } = await exportToGoogleCalendar(localEvent, existingCalId);
      setIsSaving(false);

      if (result === 'success') {
        // Save the new Google Calendar event ID back to the database
        if (calendarEventId) {
          const updated = await updateEvent(getEventId(localEvent), { CalendarEventId: calendarEventId });
          setLocalEvent(updated);
          onUpdate(updated);
        }
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
    setIsCategoryOpen(false);
    setCategorySearch('');
    setOpenDropdownIdx(null);
    if (localEvent) {
      setEditName(localEvent.Name || '');
      setEditCategory(localEvent.Category || '');
      setEditPhone(localEvent.Phone || '');
      setEditPhone2(localEvent.Phone2 || '');
      setEditPhone3(localEvent.Phone3 || '');
      setEditInfo(localEvent.Info || '');
      setEditReferral(localEvent.Referral || '');
      setEditEventDate(localEvent.EventDate ? toAmericanDate(localEvent.EventDate.slice(0, 10)) : '');
      setEditSimchaInitiative(localEvent.SimchaInitiative || false);
      setEditProjector(localEvent.Projector || false);
      setEditWeinman(localEvent.Weinman || false);
      setEditFeedback(localEvent.Feedback || '');
      setEditRatings(localEvent.Ratings || null);
      setChargeText(Math.round(parseAmount(localEvent.Charge)).toString());
      setPaymentText(Math.round(parseAmount(localEvent.Payment)).toString());

      // Reset location rows
      if (localEvent.locations && localEvent.locations.length > 0) {
        setEditLocations(localEvent.locations.map((loc) => {
          const s = parseTime24(loc.startTime);
          const e = parseTime24(loc.endTime);
          return {
            id: loc.id, place: loc.place, address: loc.address,
            eventDate: loc.eventDate ? toAmericanDate(loc.eventDate) : '',
            startHour: s.hour, startMin: s.min, startPeriod: s.period,
            endHour: e.hour, endMin: e.min, endPeriod: e.period,
            placeSearch: '',
            isHouse: loc.place === 'Private Home',
          };
        }));
      } else {
        const s = parseTime24(localEvent.Start);
        const e = parseTime24(localEvent.End);
        setEditLocations([{
          place: localEvent.Place || '', address: localEvent.Address || '',
          eventDate: localEvent.EventDate ? toAmericanDate(localEvent.EventDate.slice(0, 10)) : '',
          startHour: s.hour, startMin: s.min, startPeriod: s.period,
          endHour: e.hour, endMin: e.min, endPeriod: e.period,
          placeSearch: '',
        }]);
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

    // Build locations for saveEventLocations
    const locationsToSave = editLocations.map((loc, i) => ({
      place: loc.isHouse ? 'Private Home' : loc.place.trim(),
      address: loc.address.trim(),
      eventDate: loc.eventDate ? toISODate(loc.eventDate) : '',
      startTime: loc.startHour ? to24Hour(loc.startHour, loc.startMin, loc.startPeriod) : '',
      endTime: loc.endHour ? to24Hour(loc.endHour, loc.endMin, loc.endPeriod) : '',
      sortOrder: i,
    }));

    const firstLoc = locationsToSave[0];
    const startTime = firstLoc?.startTime || '';
    const endTime = firstLoc?.endTime || '';

    // Optimistic update
    const optimisticEvent = {
      ...localEvent,
      Name: editName.trim(),
      Category: editCategory,
      Place: firstLoc?.place || '',
      Address: firstLoc?.address || '',
      Place2: locationsToSave[1]?.place || '',
      Address2: locationsToSave[1]?.address || '',
      Place3: locationsToSave[2]?.place || '',
      Address3: locationsToSave[2]?.address || '',
      Phone: editPhone.trim(),
      Phone2: editPhone2.trim(),
      Phone3: editPhone3.trim(),
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
      locations: locationsToSave.map((loc, i) => ({
        id: editLocations[i]?.id || '',
        eventId: localEvent.id,
        ...loc,
      })) as EventLocation[],
    };

    setLocalEvent(optimisticEvent);
    setIsEditing(false);
    setOpenDropdownIdx(null);

    try {
      setIsSaving(true);

      // Save locations to relational table
      const savedLocs = await saveEventLocations(getEventId(localEvent), locationsToSave);

      const updates = {
        Name: editName.trim(),
        Category: editCategory,
        Place: firstLoc?.place || '',
        Address: firstLoc?.address || '',
        Place2: locationsToSave[1]?.place || '',
        Address2: locationsToSave[1]?.address || '',
        Place3: locationsToSave[2]?.place || '',
        Address3: locationsToSave[2]?.address || '',
        Phone: editPhone.trim(),
        Phone2: editPhone2.trim(),
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

      let updatedEvent = await updateEvent(getEventId(localEvent), updates);
      updatedEvent = { ...updatedEvent, locations: savedLocs };
      onUpdate(updatedEvent);
      setLocalEvent(updatedEvent);

      // Schedule pre-event reminder if enabled
      const [remEnabled, remMins] = await Promise.all([getReminderEnabled(), getReminderMinutes()]);
      if (remEnabled) schedulePreEventReminder(updatedEvent, remMins);

      let savedToastText = '✓ Saved';

      // If previously exported to Google Calendar, replace the old calendar event
      const existingCalId = localEvent.CalendarEventId || undefined;
      if (existingCalId) {
        try {
          const authenticated = await isAuthenticated();
          if (authenticated) {
            const { result, calendarEventId, deleteWarning } = await exportToGoogleCalendar(updatedEvent, existingCalId);
            if (result === 'success' && calendarEventId) {
              updatedEvent = await updateEvent(getEventId(updatedEvent), { CalendarEventId: calendarEventId });
              onUpdate(updatedEvent);
              setLocalEvent(updatedEvent);
              if (deleteWarning) {
                savedToastText = '✓ Saved (old calendar entry not deleted!)';
                console.warn('Delete failed:', deleteWarning);
              } else {
                savedToastText = '✓ Saved & Calendar Updated';
              }
            } else if (result === 'needsReauth') {
              savedToastText = '✓ Saved (sign in to update calendar)';
            } else {
              savedToastText = '✓ Saved (calendar update failed)';
            }
          } else {
            savedToastText = '✓ Saved (not signed in to Google)';
          }
        } catch (calErr) {
          console.warn('Calendar re-export failed:', calErr);
          savedToastText = '✓ Saved (calendar update failed)';
        }
      }

      // Show toast message
      setSavedToastText(savedToastText);
      setShowSavedToast(true);
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

  const addNewPart = (sameDate: boolean, sameLocation: boolean) => {
    const last = editLocations[editLocations.length - 1];
    setEditLocations((prev) => [
      ...prev,
      {
        place:     sameLocation ? last.place   : '',
        address:   sameLocation ? last.address : '',
        eventDate: sameDate     ? last.eventDate : '',
        startHour: '', startMin: '', startPeriod: 'AM' as const,
        endHour:   '', endMin:   '', endPeriod:   'PM' as const,
        placeSearch: '',
      },
    ]);
  };

  const showAddPartOptions = () => {
    const last = editLocations[editLocations.length - 1];
    const hasDate = !!last.eventDate;
    const hasLocation = !!last.place;
    Alert.alert(
      'Add Part',
      'Copy from the previous part?',
      [
        ...(hasDate && hasLocation ? [{
          text: 'Same date & location',
          onPress: () => addNewPart(true, true),
        }] : []),
        {
          text: hasDate ? `Same date (${last.eventDate}), new location` : 'Same date, new location',
          onPress: () => addNewPart(true, false),
        },
        ...(hasLocation ? [{
          text: `New date, same location (${last.place})`,
          onPress: () => addNewPart(false, true),
        }] : []),
        {
          text: 'New date & location',
          onPress: () => addNewPart(false, false),
        },
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  return (
    <>
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
              <Text style={styles.toastText}>{savedToastText}</Text>
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
                <Text style={[styles.sectionTitle, { marginTop: theme.spacing.sm }]}>Date</Text>
                <TouchableOpacity
                  style={[styles.input, styles.dateTrigger]}
                  onPress={() => setShowMainDatePicker(true)}
                >
                  <Text style={editEventDate ? styles.dateTriggerText : styles.dateTriggerPlaceholder}>
                    {editEventDate || 'Select Date'}
                  </Text>
                  <Text>📅</Text>
                </TouchableOpacity>

                {/* Category picker */}
                <Text style={[styles.sectionTitle, { marginTop: theme.spacing.sm }]}>Category</Text>
                <TouchableOpacity
                  style={[styles.comboBox, isCategoryOpen && styles.comboBoxOpen]}
                  onPress={() => { setIsCategoryOpen(!isCategoryOpen); setOpenDropdownIdx(null); }}
                >
                  <View style={styles.comboBoxValue}>
                    {editCategory ? (
                      <>
                        <Text style={styles.comboBoxIcon}>{getCategoryIcon(editCategory)}</Text>
                        <Text style={styles.comboBoxText}>{editCategory}</Text>
                      </>
                    ) : (
                      <Text style={styles.comboBoxPlaceholder}>Select a category...</Text>
                    )}
                  </View>
                  <Text style={styles.comboBoxArrow}>{isCategoryOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isCategoryOpen && (() => {
                  const search = categorySearch.toLowerCase();
                  const filtered = search
                    ? CATEGORIES.filter((c) => c.toLowerCase().includes(search))
                    : CATEGORIES;
                  return (
                    <View style={styles.comboBoxDropdown}>
                      <View style={styles.searchRow}>
                        <TextInput
                          style={styles.searchInput}
                          value={categorySearch}
                          onChangeText={setCategorySearch}
                          placeholder="Search categories..."
                          placeholderTextColor={theme.colors.textTertiary}
                          autoFocus
                        />
                        {categorySearch ? (
                          <TouchableOpacity onPress={() => setCategorySearch('')}>
                            <Text style={styles.searchClear}>✕</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <ScrollView style={styles.comboBoxList} showsVerticalScrollIndicator nestedScrollEnabled>
                        {filtered.map((cat) => (
                          <TouchableOpacity
                            key={cat}
                            style={[styles.comboBoxItem, editCategory === cat && styles.comboBoxItemActive]}
                            onPress={() => {
                              setEditCategory(cat);
                              setCategorySearch('');
                              setIsCategoryOpen(false);
                            }}
                          >
                            <Text style={styles.comboBoxItemIcon}>{getCategoryIcon(cat)}</Text>
                            <Text style={[styles.comboBoxItemText, editCategory === cat && styles.comboBoxItemTextActive]}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        {filtered.length === 0 && (
                          <View style={styles.comboBoxItem}>
                            <Text style={styles.comboBoxItemText}>No matches for "{categorySearch}"</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  );
                })()}
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
              <>
                <TextInput
                  style={styles.input}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone number"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="phone-pad"
                />
                {phoneCount >= 2 && (
                  <View style={[styles.locationHeader, { marginTop: theme.spacing.sm }]}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginTop: 0, marginLeft: 0 }]}
                      value={editPhone2}
                      onChangeText={setEditPhone2}
                      placeholder="Phone number"
                      placeholderTextColor={theme.colors.textTertiary}
                      keyboardType="phone-pad"
                    />
                    <TouchableOpacity onPress={() => { setEditPhone2(''); setEditPhone3(''); setPhoneCount(1); }}>
                      <Text style={styles.removeLocationBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {phoneCount >= 3 && (
                  <View style={[styles.locationHeader, { marginTop: theme.spacing.sm }]}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginTop: 0, marginLeft: 0 }]}
                      value={editPhone3}
                      onChangeText={setEditPhone3}
                      placeholder="Phone number"
                      placeholderTextColor={theme.colors.textTertiary}
                      keyboardType="phone-pad"
                    />
                    <TouchableOpacity onPress={() => { setEditPhone3(''); setPhoneCount(2); }}>
                      <Text style={styles.removeLocationBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {phoneCount < 3 && (
                  <TouchableOpacity
                    style={[styles.addLocationBtn, { marginTop: theme.spacing.sm }]}
                    onPress={() => setPhoneCount(phoneCount + 1)}
                  >
                    <Text style={styles.addLocationBtnText}>+ Add Number</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {localEvent.Phone && (
                  <TouchableOpacity onPress={handlePhonePress}>
                    <Text style={styles.linkText}>
                      📞 {formatPhoneNumber(localEvent.Phone)}
                    </Text>
                  </TouchableOpacity>
                )}
                {localEvent.Phone2 && (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${localEvent.Phone2!.replace(/\D/g, '')}`)}>
                    <Text style={[styles.linkText, { marginTop: theme.spacing.xs }]}>
                      📞 {formatPhoneNumber(localEvent.Phone2)}
                    </Text>
                  </TouchableOpacity>
                )}
                {localEvent.Phone3 && (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${localEvent.Phone3!.replace(/\D/g, '')}`)}>
                    <Text style={[styles.linkText, { marginTop: theme.spacing.xs }]}>
                      📞 {formatPhoneNumber(localEvent.Phone3)}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Location Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            {isEditing ? (
              <>
                {editLocations.map((loc, idx) => {
                  const effectivePlaces = dbPlaces ? Object.keys(dbPlaces).sort() : [];
                  const effectiveAddresses = dbPlaces || {};
                  const allPlaces = [...effectivePlaces, ...customPlaces];
                  const search = loc.placeSearch.toLowerCase();
                  const filtered = search ? allPlaces.filter((p) => p.toLowerCase().includes(search)) : allPlaces;
                  const canAdd = loc.placeSearch.trim() && !allPlaces.some((p) => p.toLowerCase() === loc.placeSearch.trim().toLowerCase());
                  const updateLoc = (patch: Partial<EditLocRow>) =>
                    setEditLocations((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

                  return (
                    <View key={idx} style={idx > 0 ? styles.locationBlock : undefined}>
                      {/* Location header */}
                      <View style={styles.locationHeader}>
                        <Text style={[styles.sectionTitle, { fontSize: theme.fontSize.sm, marginBottom: 0 }]}>
                          Location {idx + 1}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {/* Show house toggle only when no regular venue is selected */}
                          {(!loc.place || loc.place === 'Private Home') && (
                            <TouchableOpacity
                              onPress={() => {
                                const updateLoc = (patch: Partial<EditLocRow>) =>
                                  setEditLocations((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
                                updateLoc({ isHouse: !loc.isHouse, place: !loc.isHouse ? 'Private Home' : '', placeSearch: '' });
                                setOpenDropdownIdx(null);
                              }}
                              style={[styles.houseToggle, loc.isHouse && styles.houseToggleActive]}
                            >
                              <Text style={[styles.houseToggleText, loc.isHouse && styles.houseToggleTextActive]}>
                                🏠 House
                              </Text>
                            </TouchableOpacity>
                          )}
                          {editLocations.length > 1 && (
                            <TouchableOpacity onPress={() => {
                              setOpenDropdownIdx(null);
                              setEditLocations((prev) => prev.filter((_, i) => i !== idx));
                            }}>
                              <Text style={styles.removeLocationBtn}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Place combobox — hidden when isHouse */}
                      {loc.isHouse ? (
                        <View style={[styles.placeComboRow, { paddingVertical: 8 }]}>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.sm }}>
                            🏠 Private Home
                          </Text>
                        </View>
                      ) : (
                        <>
                          <View style={styles.placeComboRow}>
                            <TouchableOpacity
                              style={[styles.comboBox, openDropdownIdx === idx && styles.comboBoxOpen, styles.placeComboFlex]}
                              onPress={() => setOpenDropdownIdx(openDropdownIdx === idx ? null : idx)}
                            >
                              <View style={styles.comboBoxValue}>
                                {loc.place
                                  ? <Text style={styles.comboBoxText}>{loc.place}</Text>
                                  : <Text style={styles.comboBoxPlaceholder}>Select a place...</Text>}
                              </View>
                              <Text style={styles.comboBoxArrow}>{openDropdownIdx === idx ? '▲' : '▼'}</Text>
                            </TouchableOpacity>
                            {loc.place ? (
                              <TouchableOpacity onPress={() => updateLoc({ place: '', address: '' })}>
                                <Text style={styles.searchClear}>✕</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>

                          {/* Place dropdown */}
                          {openDropdownIdx === idx && (
                            <View style={styles.comboBoxDropdown}>
                              <View style={styles.searchRow}>
                                <TextInput
                                  style={styles.searchInput}
                                  value={loc.placeSearch}
                                  onChangeText={(t) => updateLoc({ placeSearch: t })}
                                  placeholder="Search or add place..."
                                  placeholderTextColor={theme.colors.textTertiary}
                                  returnKeyType="done"
                                  autoFocus
                                  onSubmitEditing={() => {
                                    if (canAdd) {
                                      const p = loc.placeSearch.trim();
                                      setCustomPlaces((prev) => [...prev, p]);
                                      updateLoc({ place: p, placeSearch: '', isHouse: false });
                                      savePlace(p, loc.address, userRegion);
                                      setOpenDropdownIdx(null);
                                    }
                                  }}
                                />
                                {loc.placeSearch ? (
                                  <TouchableOpacity onPress={() => updateLoc({ placeSearch: '' })}>
                                    <Text style={styles.searchClear}>✕</Text>
                                  </TouchableOpacity>
                                ) : null}
                              </View>
                              <ScrollView style={styles.comboBoxList} showsVerticalScrollIndicator nestedScrollEnabled>
                                {filtered.map((p) => (
                                  <TouchableOpacity
                                    key={p}
                                    style={[styles.comboBoxItem, loc.place === p && styles.comboBoxItemActive]}
                                    onPress={() => {
                                      updateLoc({ place: p, address: effectiveAddresses[p] || loc.address, placeSearch: '', isHouse: false });
                                      setOpenDropdownIdx(null);
                                    }}
                                  >
                                    <Text style={[styles.comboBoxItemText, loc.place === p && styles.comboBoxItemTextActive]}>{p}</Text>
                                  </TouchableOpacity>
                                ))}
                                {canAdd && (
                                  <TouchableOpacity style={styles.comboBoxItem} onPress={() => {
                                    const p = loc.placeSearch.trim();
                                    setCustomPlaces((prev) => [...prev, p]);
                                    updateLoc({ place: p, placeSearch: '', isHouse: false });
                                    savePlace(p, loc.address, userRegion);
                                    setOpenDropdownIdx(null);
                                  }}>
                                    <Text style={styles.addNewPlaceText}>+ Add "{loc.placeSearch.trim()}"</Text>
                                  </TouchableOpacity>
                                )}
                                {filtered.length === 0 && !canAdd && (
                                  <View style={styles.comboBoxItem}><Text style={styles.comboBoxItemText}>No matches</Text></View>
                                )}
                              </ScrollView>
                            </View>
                          )}
                        </>
                      )}

                      {/* Address */}
                      <TextInput
                        style={[styles.input, { marginLeft: 0, marginTop: theme.spacing.sm }]}
                        value={loc.address}
                        onChangeText={(t) => updateLoc({ address: t })}
                        placeholder="Address"
                        placeholderTextColor={theme.colors.textTertiary}
                      />

                      {/* Date — calendar picker */}
                      <TouchableOpacity
                        style={[styles.input, styles.dateTrigger, { marginLeft: 0, marginTop: theme.spacing.sm }]}
                        onPress={() => setDatePickerLocIdx(idx)}
                      >
                        <Text style={loc.eventDate ? styles.dateTriggerText : styles.dateTriggerPlaceholder}>
                          {loc.eventDate || 'Select Date'}
                        </Text>
                        <Text>📅</Text>
                      </TouchableOpacity>

                      {/* Start time */}
                      <Text style={styles.timeLabel}>Start Time</Text>
                      <View style={styles.timeRow}>
                        <TextInput style={styles.timeInput} value={loc.startHour} onChangeText={(t) => updateLoc({ startHour: t })} placeholder="HH" placeholderTextColor={theme.colors.textTertiary} keyboardType="number-pad" maxLength={2} />
                        <Text style={styles.timeSeparator}>:</Text>
                        <TextInput style={styles.timeInput} value={loc.startMin} onChangeText={(t) => updateLoc({ startMin: t })} placeholder="MM" placeholderTextColor={theme.colors.textTertiary} keyboardType="number-pad" maxLength={2} />
                        <TouchableOpacity style={styles.periodButton} onPress={() => updateLoc({ startPeriod: loc.startPeriod === 'AM' ? 'PM' : 'AM' })}>
                          <Text style={styles.periodButtonText}>{loc.startPeriod}</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Duration quick-select */}
                      <View style={styles.locDurationRow}>
                        {[1, 2, 3, 4].map((hrs) => {
                          const applyLocDuration = () => {
                            const h = parseInt(loc.startHour) || 0;
                            const m = parseInt(loc.startMin) || 0;
                            if (!loc.startHour && !loc.startMin) return;
                            let startH24 = h;
                            if (loc.startPeriod === 'PM' && h !== 12) startH24 += 12;
                            if (loc.startPeriod === 'AM' && h === 12) startH24 = 0;
                            let totalMins = (startH24 * 60 + m + hrs * 60) % (24 * 60);
                            const endH24 = Math.floor(totalMins / 60);
                            const endM = totalMins % 60;
                            let endH12 = endH24 % 12;
                            if (endH12 === 0) endH12 = 12;
                            updateLoc({ endHour: endH12.toString(), endMin: endM.toString().padStart(2, '0'), endPeriod: endH24 >= 12 ? 'PM' : 'AM' });
                          };
                          return (
                            <TouchableOpacity key={hrs} style={styles.locDurationBtn} onPress={applyLocDuration}>
                              <Text style={styles.locDurationBtnText}>{hrs} {hrs === 1 ? 'hr' : 'hrs'}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* End time */}
                      <Text style={styles.timeLabel}>End Time</Text>
                      <View style={styles.timeRow}>
                        <TextInput style={styles.timeInput} value={loc.endHour} onChangeText={(t) => updateLoc({ endHour: t })} placeholder="HH" placeholderTextColor={theme.colors.textTertiary} keyboardType="number-pad" maxLength={2} />
                        <Text style={styles.timeSeparator}>:</Text>
                        <TextInput style={styles.timeInput} value={loc.endMin} onChangeText={(t) => updateLoc({ endMin: t })} placeholder="MM" placeholderTextColor={theme.colors.textTertiary} keyboardType="number-pad" maxLength={2} />
                        <TouchableOpacity style={styles.periodButton} onPress={() => updateLoc({ endPeriod: loc.endPeriod === 'AM' ? 'PM' : 'AM' })}>
                          <Text style={styles.periodButtonText}>{loc.endPeriod}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {/* Add part button */}
                <TouchableOpacity
                  style={styles.addLocationBtn}
                  onPress={showAddPartOptions}
                >
                  <Text style={styles.addLocationBtnText}>+ Add Part</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {localEvent.locations && localEvent.locations.length > 0 ? (
                  localEvent.locations.map((loc, i) => {
                    // Highlight only when there are multiple locations (to distinguish which belongs to this date)
                    const hasMultipleLocations = (localEvent.locations?.length ?? 0) > 1;
                    const isActiveForViewDate = hasMultipleLocations && (localEvent._isContinuation
                      ? loc.eventDate === viewDate
                      : (!loc.eventDate || loc.eventDate === viewDate));
                    return (
                      <View
                        key={i}
                        style={[
                          i > 0 ? { marginTop: theme.spacing.md } : undefined,
                          isActiveForViewDate ? styles.activeLocationBlock : undefined,
                        ]}
                      >
                        {!!loc.eventDate && loc.eventDate !== viewDate && (
                          <Text style={styles.infoText}>📅 {formatEventDate(loc.eventDate)}</Text>
                        )}
                        {!!loc.place && <Text style={styles.infoText}>📍 {loc.place}</Text>}
                        {!!loc.address && (
                          <TouchableOpacity onPress={() => openAddressInNavApp(loc.address)}>
                            <Text style={styles.linkText}>{loc.address}</Text>
                          </TouchableOpacity>
                        )}
                        {!!loc.startTime && (
                          <Text style={styles.infoText}>
                            ⏱️ {formatTime(loc.startTime)}{loc.endTime ? ` – ${formatTime(loc.endTime)}` : ''}
                          </Text>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <>
                    {localEvent.Place && <Text style={styles.infoText}>📍 {localEvent.Place}</Text>}
                    {localEvent.Address && (
                      <TouchableOpacity onPress={handleAddressPress}>
                        <Text style={styles.linkText}>{localEvent.Address}</Text>
                      </TouchableOpacity>
                    )}
                    {localEvent.Place2 && (
                      <Text style={[styles.infoText, { marginTop: theme.spacing.sm }]}>📍 {localEvent.Place2}</Text>
                    )}
                    {localEvent.Address2 && (
                      <TouchableOpacity onPress={() => openAddressInNavApp(localEvent.Address2!)}>
                        <Text style={styles.linkText}>{localEvent.Address2}</Text>
                      </TouchableOpacity>
                    )}
                    {localEvent.Place3 && (
                      <Text style={[styles.infoText, { marginTop: theme.spacing.sm }]}>📍 {localEvent.Place3}</Text>
                    )}
                    {localEvent.Address3 && (
                      <TouchableOpacity onPress={() => openAddressInNavApp(localEvent.Address3!)}>
                        <Text style={styles.linkText}>{localEvent.Address3}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            )}
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            {isEditing ? null : (
              <>
                <Text style={styles.infoText}>
                  📅 {formatEventDateTime({ ...localEvent, Start: scheduleStart ?? '', End: scheduleEnd ?? '' })}
                </Text>
                {scheduleEnd && (() => {
                  const [sh, sm] = (scheduleStart || '00:00').split(':').map(Number);
                  const [eh, em] = scheduleEnd.split(':').map(Number);
                  let totalMins = (eh * 60 + em) - (sh * 60 + sm);
                  if (totalMins < 0) totalMins += 24 * 60; // handle overnight (e.g. 8:45 PM – 12:15 AM)
                  const hrs = Math.floor(totalMins / 60);
                  const mins = totalMins % 60;
                  const duration = hrs > 0 && mins > 0 ? `${hrs}h ${mins}m` : hrs > 0 ? `${hrs}h` : `${mins}m`;
                  return (
                    <Text style={styles.infoText}>
                      ⏱️ {formatTime(scheduleStart)} - {formatTime(scheduleEnd)}{'  •  '}{duration}
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
          {(isEditing || localEvent.Info) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.feedbackInput]}
                  value={editInfo}
                  onChangeText={setEditInfo}
                  placeholder="Add notes..."
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.infoText}>{localEvent.Info}</Text>
              )}
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

    {/* Main event date picker */}
    <Modal
      visible={showMainDatePicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowMainDatePicker(false)}
    >
      <TouchableOpacity
        style={styles.datePickerOverlay}
        activeOpacity={1}
        onPress={() => setShowMainDatePicker(false)}
      >
        <TouchableOpacity activeOpacity={1}>
          <View style={styles.datePickerSheet}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowMainDatePicker(false)}>
                <Text style={styles.datePickerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Calendar
              current={editEventDate ? toISODate(editEventDate) : undefined}
              onDayPress={(day) => {
                setEditEventDate(toAmericanDate(day.dateString));
                setShowMainDatePicker(false);
              }}
              markedDates={
                editEventDate
                  ? { [toISODate(editEventDate)]: { selected: true, selectedColor: theme.colors.purple } }
                  : {}
              }
              theme={{
                calendarBackground: theme.colors.cardBackground,
                textSectionTitleColor: theme.colors.textSecondary,
                todayTextColor: '#22C55E',
                dayTextColor: theme.colors.textPrimary,
                textDisabledColor: theme.colors.disabled,
                arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.textPrimary,
                selectedDayBackgroundColor: theme.colors.purple,
                selectedDayTextColor: '#FFFFFF',
              }}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>

    {/* Date picker modal — separate so it layers above the main pageSheet modal */}
    <Modal
      visible={datePickerLocIdx !== null}
      transparent
      animationType="slide"
      onRequestClose={() => setDatePickerLocIdx(null)}
    >
      <TouchableOpacity
        style={styles.datePickerOverlay}
        activeOpacity={1}
        onPress={() => setDatePickerLocIdx(null)}
      >
        <TouchableOpacity activeOpacity={1}>
          <View style={styles.datePickerSheet}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setDatePickerLocIdx(null)}>
                <Text style={styles.datePickerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {datePickerLocIdx !== null && (
              <Calendar
                current={
                  editLocations[datePickerLocIdx]?.eventDate
                    ? toISODate(editLocations[datePickerLocIdx].eventDate)
                    : undefined
                }
                onDayPress={(day) => {
                  const american = toAmericanDate(day.dateString);
                  setEditLocations((prev) =>
                    prev.map((r, i) => i === datePickerLocIdx ? { ...r, eventDate: american } : r)
                  );
                  setDatePickerLocIdx(null);
                }}
                markedDates={
                  editLocations[datePickerLocIdx]?.eventDate
                    ? { [toISODate(editLocations[datePickerLocIdx].eventDate)]: { selected: true, selectedColor: theme.colors.purple } }
                    : {}
                }
                theme={{
                  calendarBackground: theme.colors.cardBackground,
                  textSectionTitleColor: theme.colors.textSecondary,
                  todayTextColor: '#22C55E',
                  dayTextColor: theme.colors.textPrimary,
                  textDisabledColor: theme.colors.disabled,
                  arrowColor: theme.colors.primary,
                  monthTextColor: theme.colors.textPrimary,
                  selectedDayBackgroundColor: theme.colors.purple,
                  selectedDayTextColor: '#FFFFFF',
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  locationBlock: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  activeLocationBlock: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  removeLocationBtn: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.sm,
  },
  houseToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  },
  houseToggleActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: theme.colors.primary,
  },
  houseToggleText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  houseToggleTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  addLocationBtn: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addLocationBtnText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    textAlign: 'left',
  },
  dateTriggerText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.semibold,
  },
  dateTriggerPlaceholder: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textTertiary,
  },
  datePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  datePickerSheet: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  datePickerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  datePickerClose: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.sm,
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
  locDurationRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  locDurationBtn: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locDurationBtnText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
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
  comboBoxIcon: {
    fontSize: 18,
    marginRight: theme.spacing.sm,
  },
  comboBoxItemIcon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
    width: 24,
  },
  comboBoxItemText: {
    flex: 1,
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
