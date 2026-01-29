import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
} from 'react-native';
import { Event, EventCategory } from '../types/Event';
import { EventCard } from '../components/EventCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { EventDetailModal } from '../components/EventDetailModal';
import { fetchEvents } from '../services/api';
import { sortEventsByDate, getEventId } from '../utils/eventHelpers';
import { groupEventsByYearAndCategory, getCategoryIcon } from '../utils/categoryHelpers';
import { theme } from '../theme/theme';

export const ByCategoryScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<Record<string, Record<EventCategory, Event[]>>>({});
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
      const grouped = groupEventsByYearAndCategory(sorted);
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
    const grouped = groupEventsByYearAndCategory(events.map((event) =>
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

  // Category order for display
  const categories: EventCategory[] = [
    'Bar Mitzvah',
    'Vort',
    'Bris',
    'Pidyon Haben',
    'School',
    'Photoshoot',
    'Wedding',
    'CM',
    'Parlor Meeting',
    'Siyum',
    "L'Chaim",
  ];

  // Get sorted years (most recent first)
  const years = Object.keys(groupedEvents).sort((a, b) => parseInt(b) - parseInt(a));

  // Calculate total events
  const totalEvents = years.reduce((sum, year) => {
    return sum + Object.values(groupedEvents[year]).reduce(
      (yearSum, categoryEvents) => yearSum + categoryEvents.length,
      0
    );
  }, 0);

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

      {/* Year Sections */}
      {years.map((year) => {
        const yearCategories = groupedEvents[year];
        const yearEventCount = Object.values(yearCategories).reduce(
          (sum, categoryEvents) => sum + categoryEvents.length,
          0
        );

        if (yearEventCount === 0) return null;

        return (
          <CollapsibleSection
            key={year}
            title={`📅 ${year}`}
            count={yearEventCount}
            defaultExpanded={false}
          >
            {/* Category Sections within Year */}
            <View style={styles.categoryContainer}>
              {categories.map((category) => {
                const eventsInCategory = yearCategories[category];
                if (eventsInCategory.length === 0) return null;

                return (
                  <CollapsibleSection
                    key={`${year}-${category}`}
                    title={`${getCategoryIcon(category)} ${category}`}
                    count={eventsInCategory.length}
                    defaultExpanded={false}
                  >
                    {eventsInCategory.map((event) => (
                      <EventCard
                        key={getEventId(event)}
                        event={event}
                        onPress={() => handleEventPress(event)}
                      />
                    ))}
                  </CollapsibleSection>
                );
              })}
            </View>
          </CollapsibleSection>
        );
      })}

      {totalEvents === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📂</Text>
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
  categoryContainer: {
    marginLeft: theme.spacing.lg,
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
