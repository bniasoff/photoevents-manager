interface StatusBadgeProps {
  label: string;
  active: boolean;
}

export function StatusBadge({ label, active }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        active ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
      }`}
    >
      {label}
    </span>
  );
}
