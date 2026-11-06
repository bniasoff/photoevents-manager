import { useMemo } from 'react';
import type { Event } from '../types/Event';
import { getEventStatus, isUnpaid, isPastEvent } from '../lib/eventHelpers';
import { CollapsibleSection } from './CollapsibleSection';
import { EventRow } from './EventRow';

interface ByStatusViewProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
}

export function ByStatusView({ events, onSelectEvent }: ByStatusViewProps) {
  const unpaid = useMemo(() => events.filter(isUnpaid), [events]);
  const notReady = useMemo(
    () => events.filter((e) => !getEventStatus(e).isReady && isPastEvent(e)),
    [events]
  );
  const readyNotSent = useMemo(
    () => events.filter((e) => getEventStatus(e).isReady && !getEventStatus(e).isSent),
    [events]
  );

  const groups = [
    { key: 'unpaid', title: "💰 Didn't Pay", list: unpaid },
    { key: 'notReady', title: '⏳ Not Ready', list: notReady },
    { key: 'readyNotSent', title: '✅ Ready but Not Sent', list: readyNotSent },
  ];

  const total = groups.reduce((sum, g) => sum + g.list.length, 0);

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="mb-2 text-xs text-text-tertiary">{total} flagged event{total === 1 ? '' : 's'}</div>
      <div className="space-y-1">
        {groups.map((g) => (
          <CollapsibleSection key={g.key} title={g.title} count={g.list.length} defaultExpanded>
            <div className="space-y-2">
              {g.list.map((e) => (
                <EventRow key={`${g.key}-${e.id}`} event={e} onSelect={onSelectEvent} />
              ))}
            </div>
          </CollapsibleSection>
        ))}
        {total === 0 && (
          <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
            Nothing needs attention right now.
          </div>
        )}
      </div>
    </div>
  );
}
