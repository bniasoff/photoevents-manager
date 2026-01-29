import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
} from 'react-native';
import { Event, StatusGroupKey } from '../types/Event';
import { EventCard } from '../components/EventCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { EventDetailModal } from '../components/EventDetailModal';
import { fetchEvents } from '../services/api';
import { sortEventsByDate, getEventId } from '../utils/eventHelpers';
import {
  groupEventsByStatus,
  getStatusGroupLabel,
  getStatusGroupIcon,
} from '../utils/statusHelpers';
import { theme } from '../theme/theme';

export const ByStatusScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<Record<StatusGroupKey, Event[]>>({
    unpaid: [],
    notReady: [],
    readyNotSent: [],
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
      const grouped = groupEventsByStatus(sorted);
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
    const grouped = groupEventsByStatus(events.map((event) =>
      getEventId(event) === getEventId(updatedEvent) ? updatedEvent : event
    ));
    setGroupedEvents(grouped);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading events..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadEvents} />;
  }

  const statusGroups: StatusGroupKey[] = ['unpaid', 'notReady', 'readyNotSent'];

  const totalEvents = events.length;

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
        <Text style={styles.headerSubtext}>
          Events may appear in multiple groups
        </Text>
      </View>

      {/* Grouped Sections */}
      {statusGroups.map((groupKey) => {
        const eventsInGroup = groupedEvents[groupKey];

        return (
          <CollapsibleSection
            key={groupKey}
            title={getStatusGroupLabel(groupKey)}
            count={eventsInGroup.length}
            icon={getStatusGroupIcon(groupKey)}
            defaultExpanded={false}
          >
            {eventsInGroup.length > 0 ? (
              eventsInGroup.map((event) => (
                <EventCard
                  key={getEventId(event)}
                  event={event}
                  onPress={() => handleEventPress(event)}
                />
              ))
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>
                  No events in this category
                </Text>
              </View>
            )}
          </CollapsibleSection>
        );
      })}

      {totalEvents === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⚡</Text>
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
  headerSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
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
  emptySection: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: theme.spacing.xl,
  },
});
