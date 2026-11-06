import { useMemo } from 'react';
import type { Event } from '../types/Event';
import { getCategoryIcon } from '../types/Event';
import { groupEventsByYearAndCategory, sortCategories } from '../lib/categoryHelpers';
import { CollapsibleSection } from './CollapsibleSection';
import { EventRow } from './EventRow';

interface ByCategoryViewProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
}

function CategoryGroups({
  byCategory,
  onSelectEvent,
}: {
  byCategory: Record<string, Event[]>;
  onSelectEvent: (event: Event) => void;
}) {
  return (
    <div className="space-y-1">
      {sortCategories(Object.keys(byCategory)).map((category) => (
        <CollapsibleSection
          key={category}
          title={`${getCategoryIcon(category)} ${category}`}
          count={byCategory[category].length}
          indent
        >
          <div className="space-y-2">
            {byCategory[category].map((e) => (
              <EventRow key={e.id} event={e} onSelect={onSelectEvent} />
            ))}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}

export function ByCategoryView({ events, onSelectEvent }: ByCategoryViewProps) {
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

  const recurringByCategory = useMemo(() => {
    const filtered = events.filter((e) => e.Phone && (phoneEvents[e.Phone]?.length || 0) > 1);
    const map: Record<string, Event[]> = {};
    filtered.forEach((e) => {
      const cat = e.Category || 'Other';
      (map[cat] ||= []).push(e);
    });
    return map;
  }, [events, phoneEvents]);

  const feedbackByCategory = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events
      .filter((e) => new Date(e.EventDate).getFullYear() >= 2023 && e.Feedback && e.Feedback.trim().length > 0)
      .forEach((e) => {
        const cat = e.Category || 'Other';
        (map[cat] ||= []).push(e);
      });
    return map;
  }, [events]);

  const highRatingsByCategory = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events
      .filter((e) => new Date(e.EventDate).getFullYear() >= 2023 && (e.Ratings ?? 0) > 3)
      .forEach((e) => {
        const cat = e.Category || 'Other';
        (map[cat] ||= []).push(e);
      });
    return map;
  }, [events]);

  const grouped = useMemo(() => groupEventsByYearAndCategory(events), [events]);
  const years = useMemo(
    () =>
      Object.keys(grouped).sort((a, b) => {
        if (a === 'No Date') return 1;
        if (b === 'No Date') return -1;
        return parseInt(b) - parseInt(a);
      }),
    [grouped]
  );

  const totalEvents = events.length;
  const feedbackCount = Object.values(feedbackByCategory).reduce((s, a) => s + a.length, 0);
  const ratingsCount = Object.values(highRatingsByCategory).reduce((s, a) => s + a.length, 0);
  const recurringCount = Object.values(recurringByCategory).reduce((s, a) => s + a.length, 0);

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="mb-2 text-xs text-text-tertiary">{totalEvents} event{totalEvents === 1 ? '' : 's'} total</div>
      <div className="space-y-1">
        <CollapsibleSection title="💬 With Feedback" count={feedbackCount}>
          <CategoryGroups byCategory={feedbackByCategory} onSelectEvent={onSelectEvent} />
        </CollapsibleSection>

        <CollapsibleSection title="⭐ High Ratings" count={ratingsCount}>
          <CategoryGroups byCategory={highRatingsByCategory} onSelectEvent={onSelectEvent} />
        </CollapsibleSection>

        <CollapsibleSection title="↻ Recurring Customers" count={recurringCount}>
          <CategoryGroups byCategory={recurringByCategory} onSelectEvent={onSelectEvent} />
        </CollapsibleSection>

        {years.map((year) => {
          const yearCategories = grouped[year];
          const yearCount = Object.values(yearCategories).reduce((s, a) => s + a.length, 0);
          return (
            <CollapsibleSection key={year} title={`📅 ${year}`} count={yearCount}>
              <CategoryGroups byCategory={yearCategories} onSelectEvent={onSelectEvent} />
            </CollapsibleSection>
          );
        })}

        {totalEvents === 0 && (
          <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">No events found.</div>
        )}
      </div>
    </div>
  );
}
