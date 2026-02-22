import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  RefreshControl,
  Text,
  ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import { Event } from '../types/Event';
import { EventCard } from '../components/EventCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { FilterChip } from '../components/FilterChip';
import { EventDetailModal } from '../components/EventDetailModal';
import { NotificationBanner } from '../components/NotificationBanner';
import { fetchEvents } from '../services/api';
import { searchEvents, sortEventsByDate, getEventStatus, getEventId } from '../utils/eventHelpers';
import { getSortOrderPreference } from '../services/navigationPreference';
import { theme } from '../theme/theme';

type StatusFilter = 'all' | 'unpaid' | 'notReady' | 'readyNotSent';

export const AllEventsScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const loadEvents = async () => {
    try {
      setError(null);
      const [data, sortOrder] = await Promise.all([fetchEvents(), getSortOrderPreference()]);
      const sorted = sortEventsByDate(data, sortOrder);
      setEvents(sorted);
      setFilteredEvents(sorted);
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
    }, [])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('preferencesChanged', loadEvents);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let filtered = searchEvents(events, searchQuery);

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((event) => {
        const status = getEventStatus(event);
        // Check if Weinman checkbox is true (treat as paid for filtering)
        const isWeinman = event.Weinman || false;

        // Check if event time has already passed (compare full timestamp)
        // If EventDate doesn't include time but Start time exists, combine them
        let eventDateTime = new Date(event.EventDate);

        // If the event has a Start time and EventDate is at midnight, use the Start time
        if (event.Start && event.Start !== '') {
          const dateOnly = event.EventDate.split('T')[0];
          eventDateTime = new Date(`${dateOnly}T${event.Start}`);
        }

        const now = new Date();
        const isPastEvent = eventDateTime < now;

        // Debug logging for troubleshooting (unpaid and notReady filters)
        if ((statusFilter === 'unpaid' && !status.isPaid && !isWeinman) ||
            (statusFilter === 'notReady' && !status.isReady)) {
          console.log(`${statusFilter} event check:`, {
            Name: event.Name,
            EventDate: event.EventDate,
            Start: event.Start,
            eventDateTime: eventDateTime.toISOString(),
            now: now.toISOString(),
            isPastEvent,
            willShow: isPastEvent
          });
        }

        switch (statusFilter) {
          case 'unpaid':
            return !status.isPaid && !isWeinman && isPastEvent;
          case 'notReady':
            return !status.isReady && isPastEvent;
          case 'readyNotSent':
            return status.isReady && !status.isSent;
          default:
            return true;
        }
      });
    }

    setFilteredEvents(filtered);
  }, [searchQuery, statusFilter, events]);

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
    // Update events array with the new data
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        getEventId(event) === getEventId(updatedEvent) ? updatedEvent : event
      )
    );
  };

  const handleEventDelete = (eventId: string) => {
    setEvents((prevEvents) => prevEvents.filter((event) => getEventId(event) !== eventId));
    setFilteredEvents((prevFiltered) => prevFiltered.filter((event) => getEventId(event) !== eventId));
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading events..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadEvents} />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, place, phone..."
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Text
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            ✕
          </Text>
        )}
      </View>

      {/* Notification Banner */}
      <NotificationBanner events={events} />

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <FilterChip
          label="All"
          isActive={statusFilter === 'all'}
          onPress={() => setStatusFilter('all')}
        />
        <FilterChip
          label="Unpaid"
          icon="💰"
          isActive={statusFilter === 'unpaid'}
          onPress={() => setStatusFilter('unpaid')}
        />
        <FilterChip
          label="Not Ready"
          icon="⏳"
          isActive={statusFilter === 'notReady'}
          onPress={() => setStatusFilter('notReady')}
        />
        <FilterChip
          label="Not Sent"
          icon="📤"
          isActive={statusFilter === 'readyNotSent'}
          onPress={() => setStatusFilter('readyNotSent')}
        />
      </View>

      {/* Event Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          {(searchQuery || statusFilter !== 'all') && ` found`}
        </Text>
      </View>

      {/* Events List */}
      <View style={styles.listWrapper}>
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No events found' : 'No events available'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <EventCard event={item} onPress={() => handleEventPress(item)} onUpdate={handleEventUpdate} onDelete={handleEventDelete} />
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          />
        )}
      </View>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        visible={isModalVisible}
        onClose={handleCloseModal}
        onUpdate={handleEventUpdate}
        onDelete={handleEventDelete}
      />
    </View>
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
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.small,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    fontSize: 20,
    color: theme.colors.textTertiary,
    padding: theme.spacing.sm,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  countContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  countText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  listWrapper: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
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
});
