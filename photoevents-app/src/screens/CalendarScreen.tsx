import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';
import { Event } from '../types/Event';
import { EventCard } from '../components/EventCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EventDetailModal } from '../components/EventDetailModal';
import { CreateEventModal } from '../components/CreateEventModal';
import { fetchEvents } from '../services/api';
import { sortEventsByDate, getEventId } from '../utils/eventHelpers';
import { theme } from '../theme/theme';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

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

  const loadEvents = async () => {
    try {
      setError(null);
      const data = await fetchEvents();
      const sorted = sortEventsByDate(data);
      setEvents(sorted);

      // Create marked dates object
      const marks: any = {};
      sorted.forEach((event) => {
        try {
          const date = format(parseISO(event.EventDate), 'yyyy-MM-dd');
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
        const eventDate = format(parseISO(event.EventDate), 'yyyy-MM-dd');
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

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadEvents();
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    updateEventsForDate(day.dateString, events);
  };

  const handleTodayPress = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setSelectedDate(today);
    updateEventsForDate(today, events);
  };

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
          current={selectedDate}
          onDayPress={handleDayPress}
          markedDates={markedDatesWithSelection}
          markingType="custom"
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

        {/* Toolbar: Today + Export */}
        <View style={styles.toolbarRow}>
          <TouchableOpacity style={styles.todayButton} onPress={handleTodayPress}>
            <Text style={styles.todayButtonText}>📅 Jump to Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Text style={styles.exportButtonIcon}>📤</Text>
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Date Header */}
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>
            {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
          </Text>
          <View style={styles.eventCount}>
            <Text style={styles.eventCountText}>
              {eventsOnSelectedDate.length} event
              {eventsOnSelectedDate.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

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
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  todayButtonText: {
    fontSize: theme.fontSize.md,
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
    flex: 1,
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
});
