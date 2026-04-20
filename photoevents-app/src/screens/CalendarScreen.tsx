import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  DeviceEventEmitter,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';
import { Event } from '../types/Event';
import { EventCard } from '../components/EventCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EventDetailModal } from '../components/EventDetailModal';
import { CreateEventModal } from '../components/CreateEventModal';
import { EventActionMenu } from '../components/EventActionMenu';
import { fetchEvents, deleteEvent, updateEvent } from '../services/api';
import { getSortOrderPreference } from '../services/navigationPreference';
import { sortEventsByDate, getEventId } from '../utils/eventHelpers';
import { theme } from '../theme/theme';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getHebrewDatesMap, importHebrewCalendar } from '../services/hebrewCalendarService';

const escapeICS = (str: string): string =>
  str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');

const generateICS = (events: Event[]): string => {
  let ics =
    'BEGIN:VCALENDAR\r\n' +
    'VERSION:2.0\r\n' +
    'PRODID:-//PhotoEvents//EN\r\n' +
    'X-WR-CALNAME:Photo Events\r\n';

  events.forEach((event) => {
    try {
      const eventDate = parseISO(event.EventDate);
      const dateStr = format(eventDate, 'yyyyMMdd');

      ics += 'BEGIN:VEVENT\r\n';

      if (event.Start) {
        const [sh, sm, ss] = event.Start.split(':');
        ics += `DTSTART:${dateStr}T${sh}${sm}${ss || '00'}\r\n`;
        if (event.End) {
          const [eh, em, es] = event.End.split(':');
          ics += `DTEND:${dateStr}T${eh}${em}${es || '00'}\r\n`;
        } else {
          const endH = (parseInt(sh, 10) + 1).toString().padStart(2, '0');
          ics += `DTEND:${dateStr}T${endH}${sm}${ss || '00'}\r\n`;
        }
      } else {
        // All-day event — ICS end date is exclusive (next day)
        ics += `DTSTART;VALUE=DATE:${dateStr}\r\n`;
        const nextDay = format(
          new Date(eventDate.getTime() + 86400000),
          'yyyyMMdd'
        );
        ics += `DTEND;VALUE=DATE:${nextDay}\r\n`;
      }

      ics += `SUMMARY:${escapeICS(event.Name)}\r\n`;

      if (event.Place) {
        let location = event.Place;
        if (event.Address) location += `, ${event.Address}`;
        ics += `LOCATION:${escapeICS(location)}\r\n`;
      }

      if (event.Info) {
        ics += `DESCRIPTION:${escapeICS(event.Info)}\r\n`;
      }

      ics += `UID:${event.id || event._id || 'unknown'}@photoevents\r\n`;
      ics += 'END:VEVENT\r\n';
    } catch (err) {
      console.error('Error generating ICS for event:', err);
    }
  });

  ics += 'END:VCALENDAR\r\n';
  return ics;
};

/**
 * Build the markedDates object from a list of events and Hebrew dates.
 * Extracted so it can be called after event edits without a full network reload.
 */
const buildMarks = (
  eventsList: Event[],
  hebrewDates: Record<string, { title: string }>
): any => {
  const marks: any = {};

  // Hebrew dates
  Object.keys(hebrewDates).forEach((date) => {
    marks[date] = {
      customStyles: {
        container: { backgroundColor: '#FFB84D', borderRadius: 8 },
        text: { color: '#000000', fontWeight: 'bold' },
      },
      events: [],
      isHebrewDate: true,
      hebrewTitle: hebrewDates[date].title,
    };
  });

  // Primary event dates
  eventsList.forEach((event) => {
    try {
      const dateStr = event.EventDate.slice(0, 10);
      const date = format(parseISO(dateStr + 'T12:00:00'), 'yyyy-MM-dd');
      if (marks[date] && marks[date].isHebrewDate) {
        marks[date].customStyles.container = {
          backgroundColor: '#FF8C42', borderRadius: 8,
          borderWidth: 2, borderColor: theme.colors.purple,
        };
        marks[date].customStyles.text = { color: '#FFFFFF', fontWeight: 'bold' };
      } else if (!marks[date]) {
        marks[date] = {
          customStyles: {
            container: { backgroundColor: theme.colors.purple, borderRadius: 8 },
            text: { color: '#FFFFFF', fontWeight: 'bold' },
          },
          events: [],
        };
      }
      marks[date].events.push(event);
    } catch (err) {
      console.error('Error parsing date:', err);
    }
  });

  // Continuation dates from locations
  eventsList.forEach((event) => {
    const primaryDate = event.EventDate?.slice(0, 10) ?? '';
    (event.locations ?? []).forEach((loc) => {
      if (!loc.eventDate || loc.eventDate === primaryDate) return;
      const date = loc.eventDate;
      if (!marks[date]) {
        marks[date] = {
          customStyles: {
            container: { backgroundColor: '#DC2626', borderRadius: 8 },
            text: { color: '#FFFFFF', fontWeight: 'bold' },
          },
          events: [],
        };
      } else if (marks[date].isHebrewDate) {
        marks[date].customStyles.container = {
          backgroundColor: '#FF8C42', borderRadius: 8,
          borderWidth: 2, borderColor: theme.colors.purple,
        };
        marks[date].customStyles.text = { color: '#FFFFFF', fontWeight: 'bold' };
      }
      if (!marks[date].events.find((e: Event) => e.id === event.id)) {
        marks[date].events.push({
          ...event,
          EventDate: date + 'T12:00:00',  // override so modal shows the continuation date
          _isContinuation: true,
          _continuationFromDate: primaryDate,
          _continuationDates: [],
        });
      }
    });
  });

  // Today highlight
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  if (marks[todayStr]) {
    marks[todayStr].customStyles.container = {
      ...marks[todayStr].customStyles.container,
      borderWidth: 3,
      borderColor: '#22C55E',
    };
  } else {
    marks[todayStr] = {
      customStyles: {
        container: { backgroundColor: '#22C55E', borderRadius: 8 },
        text: { color: '#FFFFFF', fontWeight: 'bold' },
      },
      events: [],
    };
  }

  return marks;
};

export const CalendarScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [eventsOnSelectedDate, setEventsOnSelectedDate] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuEvent, setActionMenuEvent] = useState<Event | null>(null);
  const [isMovingEvent, setIsMovingEvent] = useState(false);
  const [eventToMove, setEventToMove] = useState<Event | null>(null);
  const [hebrewDatesMap, setHebrewDatesMap] = useState<Record<string, { title: string }>>({});
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [calendarKey, setCalendarKey] = useState(0);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  const loadHebrewDates = async () => {
    try {
      const hebrewDates = await getHebrewDatesMap();
      setHebrewDatesMap(hebrewDates);
      return hebrewDates;
    } catch (err) {
      console.error('Error loading Hebrew dates:', err);
      return {};
    }
  };

  const loadEvents = async () => {
    try {
      setError(null);
      const [data, sortOrder] = await Promise.all([fetchEvents(), getSortOrderPreference()]);
      const sorted = sortEventsByDate(data, sortOrder);
      setEvents(sorted);

      // Load Hebrew dates
      const hebrewDates = await loadHebrewDates();

      setMarkedDates(buildMarks(sorted, hebrewDates));

      // Load events for selected date
      updateEventsForDate(selectedDate, sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const updateEventsForDate = (date: string, eventsList: Event[]) => {
    const eventsForDate: Event[] = [];
    eventsList.forEach((event) => {
      try {
        const primaryDate = format(parseISO(event.EventDate.slice(0, 10) + 'T12:00:00'), 'yyyy-MM-dd');
        if (primaryDate === date) {
          // Primary occurrence — collect other location dates for badge
          const otherDates = (event.locations ?? [])
            .map((l) => l.eventDate)
            .filter((d): d is string => !!d && d !== primaryDate);
          eventsForDate.push({ ...event, _isContinuation: false, _continuationDates: otherDates });
          return;
        }
        // Check if any location falls on this date
        const matchingLoc = (event.locations ?? []).find((loc) => loc.eventDate === date);
        if (matchingLoc) {
          eventsForDate.push({
            ...event,
            EventDate: date + 'T12:00:00',  // override so modal shows the continuation date
            _isContinuation: true,
            _continuationFromDate: primaryDate,
            _continuationDates: [],
          });
        }
      } catch {
        // skip unparseable dates
      }
    });
    setEventsOnSelectedDate(eventsForDate);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('preferencesChanged', loadEvents);
    return () => sub.remove();
  }, []);

  const phoneEvents = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach((e) => {
      if (e.Phone) {
        if (!map[e.Phone]) map[e.Phone] = [];
        map[e.Phone].push(e);
      }
    });
    return map;
  }, [events]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadEvents();
  };

  const handleDayPress = (day: DateData) => {
    if (isMovingEvent) {
      // In move mode - move the event to this date
      handleMoveToDate(day.dateString);
    } else {
      // Normal mode - select date
      setSelectedDate(day.dateString);
      updateEventsForDate(day.dateString, events);
    }
  };

  const handleTodayPress = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setSelectedDate(today);
    setCurrentMonth(today);
    setCalendarKey((k) => k + 1);
    updateEventsForDate(today, events);
  };

  const handleMonthChange = (month: { dateString: string }) => {
    setCurrentMonth(month.dateString);
  };

  const handleYearSelect = (year: number) => {
    const month = currentMonth.slice(5, 7);
    const newMonth = `${year}-${month}-01`;
    setCurrentMonth(newMonth);
    setCalendarKey((k) => k + 1);
    setYearPickerVisible(false);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const year = currentMonth.slice(0, 4);
    const newMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    setCurrentMonth(newMonth);
    setCalendarKey((k) => k + 1);
    setMonthPickerVisible(false);
  };

  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];

  const currentYear = parseInt(currentMonth.slice(0, 4), 10);
  const currentMonthIndex = parseInt(currentMonth.slice(5, 7), 10) - 1;
  const yearRange = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedEvent(null);
  };

  const handleEventUpdate = (updatedEvent: Event) => {
    const updatedEvents = events.map((event) =>
      getEventId(event) === getEventId(updatedEvent) ? updatedEvent : event
    );
    setEvents(updatedEvents);
    setMarkedDates(buildMarks(updatedEvents, hebrewDatesMap));
    updateEventsForDate(selectedDate, updatedEvents);
  };

  const handleEventCreated = (newEvent: Event) => {
    loadEvents().then(() => {
      // After reload, patch CalendarEventId back into both arrays in case schema
      // cache omitted it. eventsOnSelectedDate is what EventCard/EventDetailModal receive.
      if (newEvent.CalendarEventId) {
        const patchCalId = (e: Event) =>
          getEventId(e) === getEventId(newEvent)
            ? { ...e, CalendarEventId: newEvent.CalendarEventId }
            : e;
        setEvents((prev) => prev.map(patchCalId));
        setEventsOnSelectedDate((prev) => prev.map(patchCalId));
      }
    });
  };

  const handleEventLongPress = (event: Event) => {
    setActionMenuEvent(event);
    setActionMenuVisible(true);
  };

  const handleDeleteEvent = async () => {
    if (!actionMenuEvent) return;

    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${actionMenuEvent.Name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(getEventId(actionMenuEvent));

              // Remove from events array
              const updatedEvents = events.filter(
                (e) => getEventId(e) !== getEventId(actionMenuEvent)
              );
              setEvents(updatedEvents);
              setMarkedDates(buildMarks(updatedEvents, hebrewDatesMap));
              updateEventsForDate(selectedDate, updatedEvents);

              // Close menu
              setActionMenuVisible(false);
              setActionMenuEvent(null);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event.');
              console.error('Error deleting event:', error);
            }
          },
        },
      ]
    );
  };

  const handleStartChangeDate = () => {
    setEventToMove(actionMenuEvent);
    setIsMovingEvent(true);
    setActionMenuVisible(false);
    setActionMenuEvent(null);
  };

  const handleCancelMove = () => {
    setIsMovingEvent(false);
    setEventToMove(null);
  };

  const handleMoveToDate = async (newDateString: string) => {
    if (!eventToMove) return;

    try {
      console.log('Moving event to date:', newDateString);
      console.log('Old event date:', eventToMove.EventDate);

      // Update event with new date - add time component to prevent timezone shift
      // Save as noon local time to ensure it stays on the correct day
      const updates = {
        EventDate: newDateString + 'T12:00:00',
      };

      await updateEvent(getEventId(eventToMove), updates);

      // Reload all events from database to ensure we have fresh data
      const [data, sortOrder] = await Promise.all([fetchEvents(), getSortOrderPreference()]);
      const sorted = sortEventsByDate(data, sortOrder);
      setEvents(sorted);

      // Rebuild marked dates with fresh events
      setMarkedDates(buildMarks(sorted, hebrewDatesMap));

      // Change selected date to the new date and update displayed events
      setSelectedDate(newDateString);
      updateEventsForDate(newDateString, sorted);

      // Exit move mode
      setIsMovingEvent(false);
      setEventToMove(null);

      // Show success feedback
      Alert.alert('Success', `Event moved to ${format(parseISO(newDateString), 'MMM d, yyyy')}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to move event.');
      console.error('Error moving event:', error);
    }
  };

  const handleExport = async () => {
    try {
      const icsContent = generateICS(events);
      const filePath = cacheDirectory + 'PhotoEvents.ics';
      await writeAsStringAsync(filePath, icsContent);
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/calendar',
        dialogTitle: 'Export Photo Events',
      });
    } catch (err) {
      Alert.alert('Export Failed', String(err));
    }
  };

  const handleImportHebrewCalendar = async () => {
    try {
      const result = await importHebrewCalendar();
      if (result.success) {
        Alert.alert(
          'Import Successful',
          `Imported ${result.count} Hebrew dates from calendar`,
          [{ text: 'OK', onPress: () => loadEvents() }]
        );
      } else {
        Alert.alert('Import Failed', result.error || 'Unknown error');
      }
    } catch (err) {
      Alert.alert('Import Failed', String(err));
    }
  };


  if (isLoading) {
    return <LoadingSpinner message="Loading calendar..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadEvents} />;
  }

  // Prepare marked dates with selection
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const markedDatesWithSelection = {
    ...markedDates,
    [selectedDate]: {
      ...markedDates[selectedDate],
      customStyles: {
        container: {
          backgroundColor: selectedDate === todayStr ? '#16A34A' : theme.colors.primary,
          borderRadius: 8,
        },
        text: {
          color: '#FFFFFF',
          fontWeight: 'bold',
        },
      },
    },
  };

  return (
    <View style={styles.container}>
      {/* Background glow orbs for depth */}
      <View style={styles.bgGlow1} pointerEvents="none" />
      <View style={styles.bgGlow2} pointerEvents="none" />
      <View style={styles.bgGlow3} pointerEvents="none" />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Calendar in glass card */}
        <View style={styles.calendarCard}>
          {/* Inner shimmer highlight at top (frosted glass effect) */}
          <View style={styles.calendarShimmer} pointerEvents="none" />
          <Calendar
            key={calendarKey}
            current={currentMonth}
            onDayPress={handleDayPress}
            onMonthChange={handleMonthChange}
            markedDates={markedDatesWithSelection}
            markingType="custom"
            enableSwipeMonths={true}

            renderArrow={(direction) => (
              <View style={styles.navArrow}>
                <Text style={styles.navArrowText}>
                  {direction === 'left' ? '‹' : '›'}
                </Text>
              </View>
            )}
            renderHeader={() => (
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => setMonthPickerVisible(true)}>
                  <Text style={styles.calendarHeaderMonth}>
                    {MONTH_NAMES[currentMonthIndex]} ▾{'  '}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setYearPickerVisible(true)}>
                  <Text style={styles.calendarHeaderYear}>{currentYear} ▾</Text>
                </TouchableOpacity>
              </View>
            )}
            theme={{
              calendarBackground: 'transparent',
              textSectionTitleColor: theme.colors.textSecondary,
              todayTextColor: '#22C55E',
              dayTextColor: theme.colors.textPrimary,
              textDisabledColor: theme.colors.disabled,
              arrowColor: theme.colors.primary,
              monthTextColor: theme.colors.textPrimary,
              indicatorColor: theme.colors.primary,
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 13,
            }}
            style={styles.calendar}
          />
        </View>

        {/* Year Picker Modal */}
        <Modal
          visible={yearPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setYearPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.yearPickerOverlay}
            activeOpacity={1}
            onPress={() => setYearPickerVisible(false)}
          >
            <View style={styles.yearPickerContainer}>
              <Text style={styles.yearPickerTitle}>Select Year</Text>
              {yearRange.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearPickerItem,
                    year === currentYear && styles.yearPickerItemActive,
                  ]}
                  onPress={() => handleYearSelect(year)}
                >
                  <Text
                    style={[
                      styles.yearPickerItemText,
                      year === currentYear && styles.yearPickerItemTextActive,
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Month Picker Modal */}
        <Modal
          visible={monthPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMonthPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.yearPickerOverlay}
            activeOpacity={1}
            onPress={() => setMonthPickerVisible(false)}
          >
            <View style={styles.yearPickerContainer}>
              <Text style={styles.yearPickerTitle}>Select Month</Text>
              {MONTH_NAMES.map((name, index) => (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.yearPickerItem,
                    index === currentMonthIndex && styles.yearPickerItemActive,
                  ]}
                  onPress={() => handleMonthSelect(index)}
                >
                  <Text
                    style={[
                      styles.yearPickerItemText,
                      index === currentMonthIndex && styles.yearPickerItemTextActive,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Toolbar: Today + Import + Export */}
        <View style={styles.toolbarRow}>
          <TouchableOpacity style={styles.glassButton} onPress={handleTodayPress}>
            <Text style={styles.glassButtonText}>📅 Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.glassButton} onPress={handleImportHebrewCalendar}>
            <Text style={styles.glassButtonText}>📥 Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.glassButton} onPress={handleExport}>
            <Text style={styles.glassButtonText}>📤 Export</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Date Header */}
        <View style={styles.dateHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateHeaderText}>
              {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
            </Text>
            {hebrewDatesMap[selectedDate] && (
              <Text style={styles.hebrewDateText}>
                ✡️ {hebrewDatesMap[selectedDate].title}
              </Text>
            )}
          </View>
          <View style={styles.eventCount}>
            <Text style={styles.eventCountText}>
              {eventsOnSelectedDate.length} event
              {eventsOnSelectedDate.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Move Mode Banner */}
        {isMovingEvent && eventToMove && (
          <View style={styles.moveBanner}>
            <Text style={styles.moveBannerText}>
              📅 Moving "{eventToMove.Name}" - Tap a date to move
            </Text>
            <TouchableOpacity onPress={handleCancelMove}>
              <Text style={styles.moveBannerCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Events List */}
        {eventsOnSelectedDate.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No events on this date</Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {eventsOnSelectedDate.map((event) => (
              <EventCard
                key={`${getEventId(event)}-${event._isContinuation ? 'cont' : 'main'}`}
                event={event}
                onPress={() => handleEventPress(event)}
                onLongPress={handleEventLongPress}
                onUpdate={handleEventUpdate}
                recurringCount={event.Phone ? Math.max(0, (phoneEvents[event.Phone]?.length || 0) - 1) : 0}
                relatedEvents={event.Phone ? (phoneEvents[event.Phone] || []).filter((e) => getEventId(e) !== getEventId(event)) : []}
                onRelatedEventPress={handleEventPress}
                isContinuation={!!event._isContinuation}
                continuationFromDate={event._continuationFromDate}
                continuationDates={event._continuationDates}
              />
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        visible={isModalVisible}
        onClose={handleCloseModal}
        onUpdate={handleEventUpdate}
        onDelete={(eventId) => {
          const updatedEvents = events.filter((e) => getEventId(e) !== eventId);
          setEvents(updatedEvents);
          setMarkedDates(buildMarks(updatedEvents, hebrewDatesMap));
          updateEventsForDate(selectedDate, updatedEvents);
          handleCloseModal();
        }}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        visible={isCreateModalVisible}
        selectedDate={selectedDate}
        onClose={() => setIsCreateModalVisible(false)}
        onEventCreated={handleEventCreated}
      />

      {/* Event Action Menu */}
      <EventActionMenu
        visible={actionMenuVisible}
        event={actionMenuEvent}
        onClose={() => {
          setActionMenuVisible(false);
          setActionMenuEvent(null);
        }}
        onDelete={handleDeleteEvent}
        onChangeDate={handleStartChangeDate}
      />

      {/* FAB - Add New Event */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsCreateModalVisible(true)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const GLASS_BG = 'rgba(255, 255, 255, 0.06)';
const GLASS_BORDER = 'rgba(255, 255, 255, 0.13)';
const GLASS_BLUE = 'rgba(59, 130, 246, 0.15)';
const GLASS_BLUE_BORDER = 'rgba(96, 165, 250, 0.4)';
const GLOW_SHADOW = {
  shadowColor: '#3B82F6',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  // Background depth orbs
  bgGlow1: {
    position: 'absolute',
    top: -100,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  bgGlow2: {
    position: 'absolute',
    bottom: 100,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  bgGlow3: {
    position: 'absolute',
    top: 260,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
  },
  // Glass card wrapping the calendar
  calendarCard: {
    margin: theme.spacing.md,
    marginBottom: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(21, 27, 46, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    overflow: 'hidden',
    ...GLOW_SHADOW,
  },
  // Frosted glass shimmer at top of card
  calendarShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  calendar: {
    borderRadius: 20,
  },
  // Blue pill nav arrows
  navArrow: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  toolbarRow: {
    flexDirection: 'row',
    margin: theme.spacing.md,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  // Unified glass button for toolbar
  glassButton: {
    flex: 1,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassButtonText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: '#CBD5E1',
  },
  dateHeader: {
    backgroundColor: GLASS_BLUE,
    borderWidth: 1,
    borderColor: GLASS_BLUE_BORDER,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    ...GLOW_SHADOW,
  },
  dateHeaderText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: '#E2E8F0',
  },
  hebrewDateText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: '#FFB84D',
    marginTop: theme.spacing.xs,
  },
  eventCount: {
    backgroundColor: 'rgba(99, 102, 241, 0.7)',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(165, 180, 252, 0.4)',
    marginLeft: theme.spacing.sm,
  },
  eventCountText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: '#FFFFFF',
  },
  eventsList: {
    marginTop: theme.spacing.sm,
  },
  emptyContainer: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: 'rgba(148, 163, 184, 0.7)',
    textAlign: 'center',
  },
  bottomPadding: {
    height: theme.spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.5)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  fabIcon: {
    fontSize: 30,
    color: '#FFFFFF',
    fontWeight: theme.fontWeight.bold,
    lineHeight: 34,
  },
  moveBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: GLASS_BLUE_BORDER,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: 14,
  },
  moveBannerText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: '#BFDBFE',
    flex: 1,
  },
  moveBannerCancel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: '#93C5FD',
    paddingHorizontal: theme.spacing.md,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  calendarHeaderMonth: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  calendarHeaderYear: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  yearPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearPickerContainer: {
    backgroundColor: 'rgba(15, 20, 50, 0.97)',
    borderRadius: 20,
    padding: theme.spacing.md,
    width: 220,
    borderWidth: 1,
    borderColor: GLASS_BLUE_BORDER,
    ...GLOW_SHADOW,
  },
  yearPickerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  yearPickerItem: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 10,
    marginVertical: 2,
  },
  yearPickerItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(165, 180, 252, 0.4)',
  },
  yearPickerItemText: {
    fontSize: theme.fontSize.lg,
    color: '#94A3B8',
    textAlign: 'center',
  },
  yearPickerItemTextActive: {
    fontWeight: theme.fontWeight.bold,
    color: '#E0E7FF',
  },
});
