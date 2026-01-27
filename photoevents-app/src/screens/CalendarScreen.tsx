import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';
import { Event } from '../types/Event';
import { EventCard } from '../components/EventCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EventDetailModal } from '../components/EventDetailModal';
import { fetchEvents } from '../services/api';
import { sortEventsByDate } from '../utils/eventHelpers';
import { theme } from '../theme/theme';

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
              marked: true,
              dotColor: theme.colors.primary,
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
        event._id === updatedEvent._id ? updatedEvent : event
      )
    );
    // Update events for selected date
    updateEventsForDate(selectedDate, events.map((event) =>
      event._id === updatedEvent._id ? updatedEvent : event
    ));
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
      selected: true,
      selectedColor: theme.colors.primary,
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
          theme={{
            calendarBackground: theme.colors.backgroundSecondary,
            textSectionTitleColor: theme.colors.textSecondary,
            selectedDayBackgroundColor: theme.colors.primary,
            selectedDayTextColor: theme.colors.textPrimary,
            todayTextColor: theme.colors.primary,
            dayTextColor: theme.colors.textPrimary,
            textDisabledColor: theme.colors.disabled,
            dotColor: theme.colors.primary,
            selectedDotColor: theme.colors.textPrimary,
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

        {/* Today Button */}
        <TouchableOpacity style={styles.todayButton} onPress={handleTodayPress}>
          <Text style={styles.todayButtonText}>📅 Jump to Today</Text>
        </TouchableOpacity>

        {/* Selected Date Header */}
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>
            {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
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
                key={event._id}
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
  todayButton: {
    backgroundColor: theme.colors.cardBackground,
    margin: theme.spacing.md,
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
});
