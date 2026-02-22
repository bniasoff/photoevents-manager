import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
  DeviceEventEmitter,
} from 'react-native';
import { format } from 'date-fns';
import { Event, DateGroupKey } from '../types/Event';
import { EventCard } from '../components/EventCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { EventDetailModal } from '../components/EventDetailModal';
import { fetchEvents } from '../services/api';
import { sortEventsByDate, getEventId } from '../utils/eventHelpers';
import { getSortOrderPreference } from '../services/navigationPreference';
import { groupEventsByDate, getDateGroupLabel } from '../utils/dateHelpers';
import { theme } from '../theme/theme';

export const ByDateScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<Record<DateGroupKey, Event[]>>({
    lastWeek: [],
    thisWeek: [],
    nextWeek: [],
    lastMonth: [],
    thisMonth: [],
    nextMonth: [],
    future: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sectionKey, setSectionKey] = useState(0);

  const loadEvents = async () => {
    try {
      setError(null);
      const [data, sortOrder] = await Promise.all([fetchEvents(), getSortOrderPreference()]);
      const sorted = sortEventsByDate(data, sortOrder);
      setEvents(sorted);
      const grouped = groupEventsByDate(sorted);
      setGroupedEvents(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvents();
      setSectionKey((k) => k + 1);
    }, [])
  );

  useEffect(() => {
    setGroupedEvents(groupEventsByDate(events));
  }, [events]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('preferencesChanged', loadEvents);
    return () => sub.remove();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadEvents();
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
  };

  const handleEventDelete = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => getEventId(e) !== eventId));
  };

  const getTodaysEvents = (): Event[] => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return events.filter((event) => {
      const eventDate = event.EventDate.slice(0, 10);
      return eventDate === today;
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading events..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadEvents} />;
  }

  const todaysEvents = getTodaysEvents();
  const dateGroups: DateGroupKey[] = [
    'thisWeek',
    'nextWeek',
    'lastWeek',
    'thisMonth',
    'nextMonth',
    'lastMonth',
    'future',
  ];

  const totalEvents = todaysEvents.length + Object.values(groupedEvents).reduce(
    (sum, group) => sum + group.length,
    0
  );

  const todayLabel = format(new Date(), 'EEEE, MMMM d');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Today Box */}
      <View style={styles.todayBox}>
        <View style={styles.todayHeader}>
          <Text style={styles.todayLabel}>📅 Today</Text>
          <Text style={styles.todayDate}>{todayLabel}</Text>
        </View>
        {todaysEvents.length > 0 ? (
          todaysEvents.map((event) => (
            <EventCard
              key={getEventId(event)}
              event={event}
              onPress={() => handleEventPress(event)}
              onUpdate={handleEventUpdate}
              onDelete={handleEventDelete}
            />
          ))
        ) : (
          <Text style={styles.noEventsToday}>No events today</Text>
        )}
      </View>

      {/* Grouped Sections */}
      {dateGroups.map((groupKey) => {
        const eventsInGroup = groupedEvents[groupKey];
        if (eventsInGroup.length === 0) return null;

        return (
          <CollapsibleSection
            key={`${groupKey}-${sectionKey}`}
            title={getDateGroupLabel(groupKey)}
            count={eventsInGroup.length}
            defaultExpanded={false}
          >
            {eventsInGroup.map((event) => (
              <EventCard
                key={getEventId(event)}
                event={event}
                onPress={() => handleEventPress(event)}
                onUpdate={handleEventUpdate}
              />
            ))}
          </CollapsibleSection>
        );
      })}

      {totalEvents === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>No events available</Text>
        </View>
      )}

      <View style={styles.bottomPadding} />

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        visible={isModalVisible}
        onClose={handleCloseModal}
        onUpdate={handleEventUpdate}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  todayBox: {
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.primary + '50',
    overflow: 'hidden',
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '20',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary + '30',
  },
  todayLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  todayDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  noEventsToday: {
    padding: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xxl,
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
