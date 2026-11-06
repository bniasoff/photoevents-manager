import { useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Event } from '../types/Event';
import { getCategoryIcon } from '../types/Event';

interface CalendarViewProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
  onCreateOnDate: (dateStr: string) => void;
}

export function CalendarView({ events, onSelectEvent, onCreateOnDate }: CalendarViewProps) {
  const [cursor, setCursor] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach((e) => {
      if (!e.EventDate) return;
      const key = e.EventDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">{format(cursor, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor((d) => subMonths(d, 1))}
            className="rounded-lg p-2 text-text-secondary hover:bg-card"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-card"
          >
            Today
          </button>
          <button
            onClick={() => setCursor((d) => addMonths(d, 1))}
            className="rounded-lg p-2 text-text-secondary hover:bg-card"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="border-b border-border bg-bg-secondary px-2 py-2 text-center text-xs font-semibold text-text-tertiary"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(key) || [];
          const inMonth = isSameMonth(day, cursor);
          return (
            <div
              key={key}
              className={`group relative min-h-[110px] border-b border-r border-border p-1.5 last:border-r-0 ${
                inMonth ? 'bg-bg' : 'bg-bg-secondary/40'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday(day)
                      ? 'bg-primary text-white'
                      : inMonth
                      ? 'text-text-secondary'
                      : 'text-text-tertiary/50'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                <button
                  onClick={() => onCreateOnDate(key)}
                  className="rounded p-0.5 text-text-tertiary opacity-0 hover:bg-card hover:text-primary group-hover:opacity-100"
                  title="Add event"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelectEvent(e)}
                    className="flex w-full items-center gap-1 truncate rounded-md bg-card px-1.5 py-1 text-left text-[11px] text-text-primary hover:bg-card-alt"
                    title={e.Name}
                  >
                    <span>{getCategoryIcon(e.Category)}</span>
                    <span className="truncate">{e.Name}</span>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="px-1.5 text-[11px] text-text-tertiary">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
