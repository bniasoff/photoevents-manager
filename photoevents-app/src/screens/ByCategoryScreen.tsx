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
import { Event } from '../types/Event';
import { EventCard } from '../components/EventCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { EventDetailModal } from '../components/EventDetailModal';
import { fetchEvents } from '../services/api';
import { sortEventsByDate, getEventId } from '../utils/eventHelpers';
import { getSortOrderPreference } from '../services/navigationPreference';
import { groupEventsByYearAndCategory, getCategoryIcon, sortCategories } from '../utils/categoryHelpers';
import { theme } from '../theme/theme';

export const ByCategoryScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<Record<string, Record<string, Event[]>>>({});
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
      const grouped = groupEventsByYearAndCategory(sorted);
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
    setGroupedEvents(groupEventsByYearAndCategory(events));
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


  // Get sorted years (most recent first)
  const years = Object.keys(groupedEvents).sort((a, b) => parseInt(b) - parseInt(a));

  // Filter events from 2023 onwards with feedback
  const eventsWithFeedbackAfter2023 = events.filter((event) => {
    const eventYear = new Date(event.EventDate).getFullYear();
    return eventYear >= 2023 && event.Feedback && event.Feedback.trim().length > 0;
  });

  // Filter events from 2023 onwards with high ratings (4-5 stars)
  const eventsWithHighRatings = events.filter((event) => {
    const eventYear = new Date(event.EventDate).getFullYear();
    return eventYear >= 2023 && event.Ratings && event.Ratings > 3;
  });

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
          <React.Fragment key={`${year}-${sectionKey}`}>
            <CollapsibleSection
              title={`📅 ${year}`}
              count={yearEventCount}
              defaultExpanded={false}
            >
              {/* Category Sections within Year — derived from data, sorted */}
              <View style={styles.categoryContainer}>
                {sortCategories(Object.keys(yearCategories)).map((category) => {
                  const eventsInCategory = yearCategories[category];
                  if (!eventsInCategory || eventsInCategory.length === 0) return null;

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
                          onUpdate={handleEventUpdate}
                          onDelete={handleEventDelete}
                        />
                      ))}
                    </CollapsibleSection>
                  );
                })}
              </View>
            </CollapsibleSection>

            {/* Show feedback section after 2023 */}
            {year === '2023' && eventsWithFeedbackAfter2023.length > 0 && (
              <CollapsibleSection
                title="💬 With Feedback"
                count={eventsWithFeedbackAfter2023.length}
                defaultExpanded={false}
              >
                {eventsWithFeedbackAfter2023.map((event) => (
                  <EventCard
                    key={getEventId(event)}
                    event={event}
                    onPress={() => handleEventPress(event)}
                  />
                ))}
              </CollapsibleSection>
            )}

            {/* Show high ratings section after feedback */}
            {year === '2023' && eventsWithHighRatings.length > 0 && (
              <CollapsibleSection
                title="⭐ High Ratings"
                count={eventsWithHighRatings.length}
                defaultExpanded={false}
              >
                {eventsWithHighRatings.map((event) => (
                  <EventCard
                    key={getEventId(event)}
                    event={event}
                    onPress={() => handleEventPress(event)}
                  />
                ))}
              </CollapsibleSection>
            )}
          </React.Fragment>
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
        onDelete={handleEventDelete}
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
