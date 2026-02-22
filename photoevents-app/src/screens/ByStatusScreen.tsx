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
import { Event, StatusGroupKey } from '../types/Event';
import { EventCard } from '../components/EventCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { EventDetailModal } from '../components/EventDetailModal';
import { fetchEvents } from '../services/api';
import { sortEventsByDate, getEventId } from '../utils/eventHelpers';
import { getSortOrderPreference } from '../services/navigationPreference';
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
  const [sectionKey, setSectionKey] = useState(0);

  const loadEvents = async () => {
    try {
      setError(null);
      const [data, sortOrder] = await Promise.all([fetchEvents(), getSortOrderPreference()]);
      const sorted = sortEventsByDate(data, sortOrder);
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

  useFocusEffect(
    useCallback(() => {
      loadEvents();
      setSectionKey((k) => k + 1);
    }, [])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('preferencesChanged', loadEvents);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    setGroupedEvents(groupEventsByStatus(events));
  }, [events]);

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
            key={`${groupKey}-${sectionKey}`}
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
                  onUpdate={handleEventUpdate}
                  onDelete={handleEventDelete}
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
