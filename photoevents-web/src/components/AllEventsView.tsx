import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Event } from '../types/Event';
import { getEventStatus, searchEvents, isUnpaid, isPastEvent } from '../lib/eventHelpers';
import { EventRow } from './EventRow';

interface AllEventsViewProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
}

type StatusFilter = 'all' | 'unpaid' | 'notReady' | 'notSent';

export function AllEventsView({ events, onSelectEvent }: AllEventsViewProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    let result = searchEvents(events, query);
    if (filter !== 'all') {
      result = result.filter((e) => {
        const s = getEventStatus(e);
        if (filter === 'unpaid') return isUnpaid(e);
        if (filter === 'notReady') return !s.isReady && isPastEvent(e);
        if (filter === 'notSent') return !s.isSent && isPastEvent(e);
        return true;
      });
    }
    return [...result].sort((a, b) => new Date(b.EventDate).getTime() - new Date(a.EventDate).getTime());
  }, [events, query, filter]);

  const chips: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unpaid', label: 'Unpaid' },
    { key: 'notReady', label: 'Not Ready' },
    { key: 'notSent', label: 'Not Sent' },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, place, phone, category…"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === c.key ? 'bg-primary text-white' : 'bg-card text-text-secondary hover:bg-card-alt'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-text-tertiary mb-2">
        {filtered.length} event{filtered.length === 1 ? '' : 's'}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {filtered.map((e) => (
          <EventRow key={e.id} event={e} onSelect={onSelectEvent} />
        ))}
        {filtered.length === 0 && (
          <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
            No events match your search.
          </div>
        )}
      </div>
    </div>
  );
}
