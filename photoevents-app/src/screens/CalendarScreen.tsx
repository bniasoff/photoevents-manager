import React, { useState, useEffect } from 'react';
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

      // Create marked dates object
      const marks: any = {};

      // First, add Hebrew dates with gold/orange color
      Object.keys(hebrewDates).forEach((date) => {
        marks[date] = {
          customStyles: {
            container: {
              backgroundColor: '#FFB84D', // Gold/orange for Hebrew holidays
              borderRadius: 18,
            },
            text: {
              color: '#000000',
              fontWeight: 'bold',
            },
          },
          events: [],
          isHebrewDate: true,
          hebrewTitle: hebrewDates[date].title,
        };
      });

      // Then, add event dates - if date already has Hebrew date, use mixed color
      sorted.forEach((event) => {
        try {
          // Extract just the date part (YYYY-MM-DD) in case it has time/timezone
          const dateStr = event.EventDate.slice(0, 10);
          const date = format(parseISO(dateStr + 'T12:00:00'), 'yyyy-MM-dd');

          if (marks[date] && marks[date].isHebrewDate) {
            // Date has both Hebrew holiday and events - use gradient/striped color
            marks[date].customStyles.container = {
              backgroundColor: '#FF8C42', // Orange blend for dates with both
              borderRadius: 18,
              borderWidth: 2,
              borderColor: theme.colors.purple,
            };
            marks[date].customStyles.text = {
              color: '#FFFFFF',
              fontWeight: 'bold',
            };
          } else if (!marks[date]) {
            // Date has only events
            marks[date] = {
              customStyles: {
                container: {
                  backgroundColor: theme.colors.purple,
                  borderRadius: 18,
                },
                text: {
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                },
              },
              events: [],
            };
          }
          marks[date].events.push(event);
        } catch (err) {
          console.error('Error parsing date:', err);
        }
      });
      setMarkedDates(marks);

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
    const eventsForDate = eventsList.filter((event) => {
      try {
        // Extract just the date part (YYYY-MM-DD) in case it has time/timezone
        const dateStr = event.EventDate.slice(0, 10);
        const eventDate = format(parseISO(dateStr + 'T12:00:00'), 'yyyy-MM-dd');
        return eventDate === date;
      } catch {
        return false;
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
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        getEventId(event) === getEventId(updatedEvent) ? updatedEvent : event
      )
    );
    // Update events for selected date
    updateEventsForDate(selectedDate, events.map((event) =>
      getEventId(event) === getEventId(updatedEvent) ? updatedEvent : event
    ));
  };

  const handleEventCreated = () => {
    loadEvents();
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
      const marks: any = {};
      sorted.forEach((event) => {
        try {
          // Extract just the date part (YYYY-MM-DD) in case it has time/timezone
          const dateStr = event.EventDate.slice(0, 10);
          const date = format(parseISO(dateStr + 'T12:00:00'), 'yyyy-MM-dd');
          if (!marks[date]) {
            marks[date] = {
              customStyles: {
                container: {
                  backgroundColor: theme.colors.purple,
                  borderRadius: 18,
                },
                text: {
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                },
              },
              events: [],
            };
          }
          marks[date].events.push(event);
        } catch (err) {
          console.error('Error parsing date:', err);
        }
      });
      setMarkedDates(marks);

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
  const markedDatesWithSelection = {
    ...markedDates,
    [selectedDate]: {
      ...markedDates[selectedDate],
      customStyles: {
        container: {
          backgroundColor: theme.colors.primary,
          borderRadius: 18,
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
        {/* Calendar */}
        <Calendar
          key={calendarKey}
          current={currentMonth}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
          markedDates={markedDatesWithSelection}
          markingType="custom"
          enableSwipeMonths={true}
          renderHeader={() => (
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarHeaderMonth}>
                {MONTH_NAMES[currentMonthIndex]}{'  '}
              </Text>
              <TouchableOpacity onPress={() => setYearPickerVisible(true)}>
                <Text style={styles.calendarHeaderYear}>{currentYear} ▾</Text>
              </TouchableOpacity>
            </View>
          )}
          theme={{
            calendarBackground: theme.colors.backgroundSecondary,
            textSectionTitleColor: theme.colors.textSecondary,
            todayTextColor: theme.colors.primary,
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

        {/* Toolbar: Today + Import + Export */}
        <View style={styles.toolbarRow}>
          <TouchableOpacity style={styles.todayButton} onPress={handleTodayPress}>
            <Text style={styles.todayButtonText}>📅 Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.importButton} onPress={handleImportHebrewCalendar}>
            <Text style={styles.importButtonIcon}>📥</Text>
            <Text style={styles.importButtonText}>Import Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Text style={styles.exportButtonIcon}>📤</Text>
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Date Header */}
        <View style={styles.dateHeader}>
          <View>
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
                key={getEventId(event)}
                event={event}
                onPress={() => handleEventPress(event)}
                onLongPress={handleEventLongPress}
                onUpdate={handleEventUpdate}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  toolbarRow: {
    flexDirection: 'row',
    margin: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  todayButton: {
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...theme.shadows.small,
  },
  todayButtonText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  importButton: {
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...theme.shadows.small,
  },
  importButtonIcon: {
    fontSize: 18,
  },
  importButtonText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  exportButton: {
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...theme.shadows.small,
  },
  exportButtonIcon: {
    fontSize: 18,
  },
  exportButtonText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  dateHeader: {
    backgroundColor: theme.colors.cardBackgroundAlt,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  dateHeaderText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  hebrewDateText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: '#FFB84D', // Gold/orange to match calendar marking
    marginTop: theme.spacing.xs,
  },
  eventCount: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  eventCountText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
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
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  bottomPadding: {
    height: theme.spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.medium,
  },
  fabIcon: {
    fontSize: 30,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
    lineHeight: 34,
  },
  moveBanner: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  moveBannerText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: '#FFFFFF',
    flex: 1,
  },
  moveBannerCancel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearPickerContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    width: 200,
    ...theme.shadows.medium,
  },
  yearPickerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  yearPickerItem: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginVertical: 2,
  },
  yearPickerItemActive: {
    backgroundColor: theme.colors.primary,
  },
  yearPickerItemText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  yearPickerItemTextActive: {
    fontWeight: theme.fontWeight.bold,
    color: '#FFFFFF',
  },
});
