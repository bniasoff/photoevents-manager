import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
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

  const loadEvents = async () => {
    try {
      setError(null);
      const data = await fetchEvents();
      const sorted = sortEventsByDate(data);
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

  useEffect(() => {
    loadEvents();
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
    // Re-group events after update
    const grouped = groupEventsByDate(events.map((event) =>
      getEventId(event) === getEventId(updatedEvent) ? updatedEvent : event
    ));
    setGroupedEvents(grouped);
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {totalEvents} event{totalEvents !== 1 ? 's' : ''} total
        </Text>
      </View>

      {/* Today Section */}
      {todaysEvents.length > 0 && (
        <CollapsibleSection
          title="Today"
          count={todaysEvents.length}
          defaultExpanded={true}
        >
          {todaysEvents.map((event) => (
            <EventCard
              key={getEventId(event)}
              event={event}
              onPress={() => handleEventPress(event)}
            />
          ))}
        </CollapsibleSection>
      )}

      {/* Grouped Sections */}
      {dateGroups.map((groupKey) => {
        const eventsInGroup = groupedEvents[groupKey];
        if (eventsInGroup.length === 0) return null;

        return (
          <CollapsibleSection
            key={groupKey}
            title={getDateGroupLabel(groupKey)}
            count={eventsInGroup.length}
            defaultExpanded={false}
          >
            {eventsInGroup.map((event) => (
              <EventCard
                key={getEventId(event)}
                event={event}
                onPress={() => handleEventPress(event)}
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
  header: {
    padding: theme.spacing.md,
  },
  headerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
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
