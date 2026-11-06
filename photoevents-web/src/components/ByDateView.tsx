import { useMemo } from 'react';
import type { Event } from '../types/Event';
import { groupEventsByDate, getDateGroupLabel, DATE_GROUP_ORDER } from '../lib/dateGrouping';
import { CollapsibleSection } from './CollapsibleSection';
import { EventRow } from './EventRow';

interface ByDateViewProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
}

export function ByDateView({ events, onSelectEvent }: ByDateViewProps) {
  const grouped = useMemo(() => groupEventsByDate(events), [events]);
  const total = DATE_GROUP_ORDER.reduce((sum, key) => sum + grouped[key].length, 0);

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="mb-2 text-xs text-text-tertiary">{total} event{total === 1 ? '' : 's'} across all periods</div>
      <div className="space-y-1">
        {DATE_GROUP_ORDER.map((key) => (
          <CollapsibleSection
            key={key}
            title={getDateGroupLabel(key)}
            count={grouped[key].length}
            defaultExpanded={key === 'thisWeek' || key === 'nextWeek'}
          >
            <div className="space-y-2">
              {grouped[key].map((e) => (
                <EventRow key={`${key}-${e.id}`} event={e} onSelect={onSelectEvent} />
              ))}
            </div>
          </CollapsibleSection>
        ))}
        {total === 0 && (
          <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">No events found.</div>
        )}
      </div>
    </div>
  );
}
