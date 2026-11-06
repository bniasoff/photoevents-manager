import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import type { Event } from './types/Event';
import { fetchEvents } from './lib/api';
import { Sidebar } from './components/Sidebar';
import type { ViewKey } from './components/Sidebar';
import { CalendarView } from './components/CalendarView';
import { AllEventsView } from './components/AllEventsView';
import { ByDateView } from './components/ByDateView';
import { ByCategoryView } from './components/ByCategoryView';
import { ByStatusView } from './components/ByStatusView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { EventFormModal } from './components/EventFormModal';
import { getSortOrderPreference, sortEventsByDate, type SortOrder } from './lib/preferences';

const VIEW_TITLES: Record<ViewKey, string> = {
  calendar: 'Calendar',
  all: 'All Events',
  byDate: 'By Date',
  byCategory: 'By Category',
  byStatus: 'By Status',
  reports: 'Reports',
  settings: 'Settings',
};

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<ViewKey>('calendar');
  const [sortOrder, setSortOrder] = useState<SortOrder>(getSortOrderPreference());

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<string | undefined>(undefined);

  const load = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      console.error(err);
      setLoadError('Failed to load events from Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sortedEvents = useMemo(() => sortEventsByDate(events, sortOrder), [events, sortOrder]);

  const openCreate = (defaultDate?: string) => {
    setCreateDefaultDate(defaultDate);
    setIsCreating(true);
  };

  const closeModal = () => {
    setEditingEvent(null);
    setIsCreating(false);
    setCreateDefaultDate(undefined);
  };

  const handleSaved = (saved: Event) => {
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
    });
    closeModal();
  };

  const handleDeleted = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    closeModal();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      <div className="no-print flex h-full">
        <Sidebar view={view} onChangeView={setView} eventCount={events.length} />
      </div>

      <main className="flex min-w-0 flex-1 flex-col p-6">
        <div className="no-print mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">{VIEW_TITLES[view]}</h1>
          <div className="flex items-center gap-2">
            <button onClick={load} className="rounded-lg p-2.5 text-text-secondary hover:bg-card" title="Refresh">
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => openCreate()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
            >
              <Plus size={16} /> Add Event
            </button>
          </div>
        </div>

        {loadError && (
          <div className="no-print mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {loadError}
          </div>
        )}

        {isLoading && events.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-text-tertiary">Loading events…</div>
        ) : view === 'calendar' ? (
          <CalendarView events={sortedEvents} onSelectEvent={setEditingEvent} onCreateOnDate={openCreate} />
        ) : view === 'all' ? (
          <AllEventsView events={sortedEvents} onSelectEvent={setEditingEvent} />
        ) : view === 'byDate' ? (
          <ByDateView events={sortedEvents} onSelectEvent={setEditingEvent} />
        ) : view === 'byCategory' ? (
          <ByCategoryView events={sortedEvents} onSelectEvent={setEditingEvent} />
        ) : view === 'byStatus' ? (
          <ByStatusView events={sortedEvents} onSelectEvent={setEditingEvent} />
        ) : view === 'reports' ? (
          <ReportsView events={sortedEvents} />
        ) : (
          <SettingsView onSortOrderChange={setSortOrder} />
        )}
      </main>

      {(editingEvent || isCreating) && (
        <EventFormModal
          event={editingEvent}
          defaultDate={createDefaultDate}
          onClose={closeModal}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

export default App;
