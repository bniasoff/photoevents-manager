import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  DeviceEventEmitter,
} from 'react-native';
import { Event } from '../types/Event';
import { EventCard } from '../components/EventCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { EventDetailModal } from '../components/EventDetailModal';
import { fetchEvents } from '../services/api';
import { sortEventsByDate, getEventId, searchEvents } from '../utils/eventHelpers';
import { getSortOrderPreference } from '../services/navigationPreference';
import { groupEventsByYearAndCategory, getCategoryIcon, sortCategories } from '../utils/categoryHelpers';
import { theme } from '../theme/theme';

export const ByCategoryScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<Record<string, Record<string, Event[]>>>({});
  const [searchQuery, setSearchQuery] = useState('');
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
    const filtered = searchEvents(events, searchQuery);
    setGroupedEvents(groupEventsByYearAndCategory(filtered));
  }, [events, searchQuery]);

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

  // Events where the customer (same phone) has booked more than once
  const recurringByCategory = useMemo(() => {
    const filtered = events.filter(
      (e) => e.Phone && (phoneEvents[e.Phone]?.length || 0) > 1
    );
    const map: Record<string, Event[]> = {};
    filtered.forEach((e) => {
      const cat = e.Category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(e);
    });
    return map;
  }, [events, phoneEvents]);

  // Feedback grouped by category — must be before early returns (hooks rules)
  const feedbackByCategory = useMemo(() => {
    const filtered = searchEvents(events, searchQuery);
    const map: Record<string, Event[]> = {};
    filtered
      .filter((e) => {
        const yr = new Date(e.EventDate).getFullYear();
        return yr >= 2023 && e.Feedback && e.Feedback.trim().length > 0;
      })
      .forEach((e) => {
        const cat = e.Category || 'Other';
        if (!map[cat]) map[cat] = [];
        map[cat].push(e);
      });
    return map;
  }, [events, searchQuery]);

  // High ratings grouped by category — must be before early returns (hooks rules)
  const highRatingsByCategory = useMemo(() => {
    const filtered = searchEvents(events, searchQuery);
    const map: Record<string, Event[]> = {};
    filtered
      .filter((e) => {
        const yr = new Date(e.EventDate).getFullYear();
        return yr >= 2023 && e.Ratings && e.Ratings > 3;
      })
      .forEach((e) => {
        const cat = e.Category || 'Other';
        if (!map[cat]) map[cat] = [];
        map[cat].push(e);
      });
    return map;
  }, [events, searchQuery]);

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
  const years = Object.keys(groupedEvents).sort((a, b) => {
    if (a === 'No Date') return 1;
    if (b === 'No Date') return -1;
    return parseInt(b) - parseInt(a);
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {totalEvents} event{totalEvents !== 1 ? 's' : ''}{searchQuery ? ' found' : ' total'}
        </Text>
      </View>

      {/* With Feedback — grouped by category */}
      {Object.keys(feedbackByCategory).length > 0 && (
        <CollapsibleSection
          title="💬 With Feedback"
          count={Object.values(feedbackByCategory).reduce((s, arr) => s + arr.length, 0)}
          defaultExpanded={false}
        >
          <View style={styles.categoryContainer}>
            {sortCategories(Object.keys(feedbackByCategory)).map((category) => (
              <CollapsibleSection
                key={`feedback-${category}`}
                title={`${getCategoryIcon(category)} ${category}`}
                count={feedbackByCategory[category].length}
                defaultExpanded={false}
              >
                {feedbackByCategory[category].map((event) => (
                  <EventCard
                    key={getEventId(event)}
                    event={event}
                    onPress={() => handleEventPress(event)}
                    recurringCount={event.Phone ? Math.max(0, (phoneEvents[event.Phone]?.length || 0) - 1) : 0}
                    relatedEvents={event.Phone ? (phoneEvents[event.Phone] || []).filter((e) => getEventId(e) !== getEventId(event)) : []}
                    onRelatedEventPress={handleEventPress}
                  />
                ))}
              </CollapsibleSection>
            ))}
          </View>
        </CollapsibleSection>
      )}

      {/* High Ratings — grouped by category */}
      {Object.keys(highRatingsByCategory).length > 0 && (
        <CollapsibleSection
          title="⭐ High Ratings"
          count={Object.values(highRatingsByCategory).reduce((s, arr) => s + arr.length, 0)}
          defaultExpanded={false}
        >
          <View style={styles.categoryContainer}>
            {sortCategories(Object.keys(highRatingsByCategory)).map((category) => (
              <CollapsibleSection
                key={`rating-${category}`}
                title={`${getCategoryIcon(category)} ${category}`}
                count={highRatingsByCategory[category].length}
                defaultExpanded={false}
              >
                {highRatingsByCategory[category].map((event) => (
                  <EventCard
                    key={getEventId(event)}
                    event={event}
                    onPress={() => handleEventPress(event)}
                    recurringCount={event.Phone ? Math.max(0, (phoneEvents[event.Phone]?.length || 0) - 1) : 0}
                    relatedEvents={event.Phone ? (phoneEvents[event.Phone] || []).filter((e) => getEventId(e) !== getEventId(event)) : []}
                    onRelatedEventPress={handleEventPress}
                  />
                ))}
              </CollapsibleSection>
            ))}
          </View>
        </CollapsibleSection>
      )}

      {/* Recurring Customers — grouped by category */}
      {Object.keys(recurringByCategory).length > 0 && (
        <CollapsibleSection
          key={`recurring-${sectionKey}`}
          title="↻ Recurring Customers"
          count={Object.values(recurringByCategory).reduce((s, arr) => s + arr.length, 0)}
          defaultExpanded={false}
        >
          <View style={styles.categoryContainer}>
            {sortCategories(Object.keys(recurringByCategory)).map((category) => {
              const eventsInCategory = recurringByCategory[category];
              if (!eventsInCategory || eventsInCategory.length === 0) return null;
              return (
                <CollapsibleSection
                  key={`recurring-${category}`}
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
                      recurringCount={event.Phone ? Math.max(0, (phoneEvents[event.Phone]?.length || 0) - 1) : 0}
                      relatedEvents={event.Phone ? (phoneEvents[event.Phone] || []).filter((e) => getEventId(e) !== getEventId(event)) : []}
                      onRelatedEventPress={handleEventPress}
                    />
                  ))}
                </CollapsibleSection>
              );
            })}
          </View>
        </CollapsibleSection>
      )}

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
            key={`${year}-${sectionKey}`}
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
                        recurringCount={event.Phone ? Math.max(0, (phoneEvents[event.Phone]?.length || 0) - 1) : 0}
                        relatedEvents={event.Phone ? (phoneEvents[event.Phone] || []).filter((e) => getEventId(e) !== getEventId(event)) : []}
                        onRelatedEventPress={handleEventPress}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    fontSize: 16,
    color: theme.colors.textTertiary,
    paddingLeft: theme.spacing.sm,
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
