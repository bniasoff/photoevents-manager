import type { Event } from '../types/Event';

export type SortOrder = 'asc' | 'desc' | 'name-asc' | 'name-desc';

const SORT_KEY = 'photoevents_sort_order';
const DEFAULT_SORT: SortOrder = 'desc';

export const getSortOrderPreference = (): SortOrder => {
  const value = localStorage.getItem(SORT_KEY);
  if (value === 'asc' || value === 'desc' || value === 'name-asc' || value === 'name-desc') return value;
  return DEFAULT_SORT;
};

export const setSortOrderPreference = (order: SortOrder): void => {
  localStorage.setItem(SORT_KEY, order);
};

export const sortEventsByDate = (events: Event[], order: SortOrder): Event[] => {
  return [...events].sort((a, b) => {
    if (order === 'name-asc' || order === 'name-desc') {
      const cmp = (a.Name || '').toLowerCase().localeCompare((b.Name || '').toLowerCase());
      return order === 'name-asc' ? cmp : -cmp;
    }
    const diff = new Date(a.EventDate).getTime() - new Date(b.EventDate).getTime();
    return order === 'asc' ? diff : -diff;
  });
};
