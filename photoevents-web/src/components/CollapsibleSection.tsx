import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  count: number;
  children: ReactNode;
  defaultExpanded?: boolean;
  indent?: boolean;
}

export function CollapsibleSection({ title, count, children, defaultExpanded = false, indent = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultExpanded);
  if (count === 0) return null;

  return (
    <div className={indent ? 'ml-4 border-l border-border pl-4' : ''}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-card"
      >
        <span className="text-sm font-semibold text-text-primary">{title}</span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-card-alt px-2 py-0.5 text-xs font-semibold text-text-secondary">{count}</span>
          <ChevronDown size={16} className={`text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && <div className="pb-2 pt-1">{children}</div>}
    </div>
  );
}
