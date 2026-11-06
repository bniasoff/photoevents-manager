import type { Event } from '../types/Event';
import { CATEGORY_ORDER } from '../types/Event';

export const determineCategory = (event: Event): string => {
  const name = event.Name?.toLowerCase() || '';
  if (name.includes('cm') || name.includes('c.m')) return 'CM';
  if (name.includes('parlor')) return 'Parlor Meeting';
  if (name.includes('siyum')) return 'Siyum';
  if (name.includes("l'chaim") || name.includes('lchaim') || name.includes('lechaim') || name.includes('chaim'))
    return "L'Chaim";

  const raw = (event.Category || '').trim();
  if (!raw) return 'Other';
  if (raw.toLowerCase() === 'kolell') return 'Kollel';

  const match = CATEGORY_ORDER.find((c) => c.toLowerCase() === raw.toLowerCase());
  return match || raw;
};

export const groupEventsByYearAndCategory = (events: Event[]): Record<string, Record<string, Event[]>> => {
  const yearGroups: Record<string, Record<string, Event[]>> = {};
  events.forEach((event) => {
    let year = 'No Date';
    if (event.EventDate) {
      const yearNum = new Date(event.EventDate).getFullYear();
      if (!isNaN(yearNum) && yearNum >= 2000 && yearNum <= 2100) year = yearNum.toString();
    }
    if (!yearGroups[year]) yearGroups[year] = {};
    const category = determineCategory(event);
    if (!yearGroups[year][category]) yearGroups[year][category] = [];
    yearGroups[year][category].push(event);
  });
  return yearGroups;
};

export const sortCategories = (categories: string[]): string[] => {
  return [...categories].sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
};
