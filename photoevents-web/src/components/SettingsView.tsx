import { useEffect, useState } from 'react';
import { CalendarCheck2, LogOut, RefreshCw } from 'lucide-react';
import { getSortOrderPreference, setSortOrderPreference, type SortOrder } from '../lib/preferences';
import { getAuthStatus, startGoogleAuth, signOutGoogle, type AuthStatus } from '../lib/googleCalendar';

interface SettingsViewProps {
  onSortOrderChange: (order: SortOrder) => void;
}

const SORT_OPTIONS: { key: SortOrder; label: string }[] = [
  { key: 'desc', label: 'Newest First' },
  { key: 'asc', label: 'Oldest First' },
  { key: 'name-asc', label: 'Name A→Z' },
  { key: 'name-desc', label: 'Name Z→A' },
];

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export function SettingsView({ onSortOrderChange }: SettingsViewProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>(getSortOrderPreference());
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const loadAuth = async () => {
    setIsLoadingAuth(true);
    setAuth(await getAuthStatus());
    setIsLoadingAuth(false);
  };

  useEffect(() => {
    loadAuth();
  }, []);

  const handleSortChange = (order: SortOrder) => {
    setSortOrder(order);
    setSortOrderPreference(order);
    onSortOrderChange(order);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    await startGoogleAuth();
    setIsConnecting(false);
  };

  const handleSignOut = async () => {
    if (!confirm('Disconnect Google Calendar? Exported events will stay on your calendar, but new exports will require signing in again.')) return;
    setIsSigningOut(true);
    await signOutGoogle();
    await loadAuth();
    setIsSigningOut(false);
  };

  const connected = auth?.authenticated && auth.hasRefreshToken;
  const deadline = auth?.signedInAt
    ? new Date(new Date(auth.signedInAt).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <div className="h-full max-w-2xl space-y-6 overflow-y-auto pr-1">
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-tertiary">Google Calendar</h3>
        <p className="mb-4 text-xs text-text-tertiary">
          Shared connection with the mobile app — sign in once, both can export events.
        </p>

        {isLoadingAuth ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <RefreshCw size={14} className="animate-spin" /> Checking status…
          </div>
        ) : connected ? (
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-success">
              <CalendarCheck2 size={16} /> Connected
            </div>
            {auth?.signedInAt && (
              <p className="mb-1 text-xs text-text-secondary">Signed in: {formatDateTime(auth.signedInAt)}</p>
            )}
            {deadline && (
              <p className="mb-4 text-xs text-text-secondary">Re-sign required by: {formatDateTime(deadline.toISOString())}</p>
            )}
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/20 disabled:opacity-50"
            >
              <LogOut size={14} /> {isSigningOut ? 'Signing out…' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-text-secondary">Not connected.</p>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CalendarCheck2 size={15} /> {isConnecting ? 'Opening…' : 'Connect Google Calendar'}
            </button>
            <p className="mt-2 text-xs text-text-tertiary">
              Opens a new tab to sign in. Come back here afterward — status updates automatically.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-tertiary">Display</h3>
        <label className="mb-2 block text-xs font-medium text-text-secondary">Sort order for All Events</label>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleSortChange(opt.key)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                sortOrder === opt.key ? 'bg-primary text-white' : 'bg-bg-secondary text-text-secondary hover:bg-card-alt'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <p className="text-xs text-text-tertiary">
        This app runs locally in your browser only — not deployed or publicly hosted. Notification timing and
        navigation-app preferences from the mobile app don't apply here.
      </p>
    </div>
  );
}
