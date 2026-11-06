import { MapPin, Phone } from 'lucide-react';
import type { Event } from '../types/Event';
import { getCategoryIcon } from '../types/Event';
import { getEventStatus, formatDate, formatTime, formatMoney } from '../lib/eventHelpers';
import { StatusBadge } from './StatusBadge';

interface EventRowProps {
  event: Event;
  onSelect: (event: Event) => void;
}

export function EventRow({ event, onSelect }: EventRowProps) {
  const status = getEventStatus(event);
  return (
    <button
      onClick={() => onSelect(event)}
      className="flex w-full items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-primary/50 hover:bg-card-alt"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-lg">
        {getCategoryIcon(event.Category)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-text-primary">{event.Name}</span>
          <span className="shrink-0 text-xs text-text-tertiary">{event.Category}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
          <span>
            {formatDate(event.EventDate)}
            {event.Start ? ` · ${formatTime(event.Start)}` : ''}
          </span>
          {event.Place && (
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {event.Place}
            </span>
          )}
          {event.Phone && (
            <span className="flex items-center gap-1">
              <Phone size={11} /> {event.Phone}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-semibold text-text-primary">{formatMoney(event.Charge)}</span>
        <div className="flex gap-1">
          <StatusBadge label="Paid" active={status.isPaid} />
          <StatusBadge label="Ready" active={status.isReady} />
          <StatusBadge label="Sent" active={status.isSent} />
        </div>
      </div>
    </button>
  );
}
