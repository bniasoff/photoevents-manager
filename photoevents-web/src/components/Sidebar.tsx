import { CalendarDays, List, CalendarRange, Tags, CircleDollarSign, BarChart3, Settings, Camera } from 'lucide-react';

export type ViewKey = 'calendar' | 'all' | 'byDate' | 'byCategory' | 'byStatus' | 'reports' | 'settings';

interface SidebarProps {
  view: ViewKey;
  onChangeView: (v: ViewKey) => void;
  eventCount: number;
}

const NAV_ITEMS: { key: ViewKey; label: string; icon: typeof CalendarDays }[] = [
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'all', label: 'All Events', icon: List },
  { key: 'byDate', label: 'By Date', icon: CalendarRange },
  { key: 'byCategory', label: 'By Category', icon: Tags },
  { key: 'byStatus', label: 'By Status', icon: CircleDollarSign },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

export function Sidebar({ view, onChangeView, eventCount }: SidebarProps) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-bg-secondary px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Camera size={18} />
        </div>
        <div>
          <div className="text-sm font-bold text-text-primary leading-tight">Photo Events</div>
          <div className="text-[11px] text-text-tertiary">{eventCount} bookings</div>
        </div>
      </div>

      <nav className="space-y-1">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChangeView(key)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              view === key
                ? 'bg-primary/15 text-primary'
                : 'text-text-secondary hover:bg-card hover:text-text-primary'
            }`}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-1">
        <button
          onClick={() => onChangeView('settings')}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            view === 'settings'
              ? 'bg-primary/15 text-primary'
              : 'text-text-secondary hover:bg-card hover:text-text-primary'
          }`}
        >
          <Settings size={17} />
          Settings
        </button>
        <div className="px-3 pt-2 text-[11px] text-text-tertiary">Running locally · not public</div>
      </div>
    </aside>
  );
}
