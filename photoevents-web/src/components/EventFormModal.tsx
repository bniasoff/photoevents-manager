import { useEffect, useState } from 'react';
import { X, Trash2, Save, CalendarPlus, Plus, Star } from 'lucide-react';
import type { Event, EventLocation } from '../types/Event';
import { createEvent, updateEvent, deleteEvent, saveEventLocations } from '../lib/api';
import { parseAmount, splitAddress, buildAddress, DEFAULT_ADDRESS, type AddressParts } from '../lib/eventHelpers';
import { exportToGoogleCalendar, startGoogleAuth } from '../lib/googleCalendar';
import { PlacePicker } from './PlacePicker';
import { CategoryPicker } from './CategoryPicker';

interface EventFormModalProps {
  event: Event | null; // null = creating a new event
  defaultDate?: string; // YYYY-MM-DD, used when creating from a calendar day click
  onClose: () => void;
  onSaved: (event: Event) => void;
  onDeleted: (id: string) => void;
}

interface ExtraLocationForm {
  place: string;
  addressParts: AddressParts;
  isHouse: boolean;
  eventDate: string; // YYYY-MM-DD or ''
  startTime: string; // HH:MM or ''
  endTime: string; // HH:MM or ''
}

const toDateInput = (iso: string): string => (iso ? iso.slice(0, 10) : '');
const toTimeInput = (t: string): string => (t ? t.slice(0, 5) : '');

const addHoursToTime = (time: string, hours: number): string => {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10) || 0);
  const totalMinutes = (h * 60 + m + hours * 60) % (24 * 60);
  const endH = Math.floor(totalMinutes / 60);
  const endM = totalMinutes % 60;
  return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
};

const emptyExtraLocation = (): ExtraLocationForm => ({
  place: '',
  addressParts: { ...DEFAULT_ADDRESS },
  isHouse: false,
  eventDate: '',
  startTime: '',
  endTime: '',
});

const locationAddressParts = (loc: EventLocation): AddressParts =>
  loc.street || loc.city || loc.state || loc.zip
    ? { street: loc.street, city: loc.city, state: loc.state, zip: loc.zip }
    : splitAddress(loc.address);

const buildInitialExtraLocations = (event: Event | null): ExtraLocationForm[] => {
  if (!event) return [];
  if (event.locations && event.locations.length > 1) {
    return event.locations.slice(1, 3).map((loc) => ({
      place: loc.place === 'Private Home' ? '' : loc.place,
      addressParts: locationAddressParts(loc),
      isHouse: loc.place === 'Private Home',
      eventDate: toDateInput(loc.eventDate),
      startTime: toTimeInput(loc.startTime),
      endTime: toTimeInput(loc.endTime),
    }));
  }
  const extras: ExtraLocationForm[] = [];
  if (event.Place2) {
    extras.push({
      place: event.Place2 === 'Private Home' ? '' : event.Place2,
      addressParts: splitAddress(event.Address2),
      isHouse: event.Place2 === 'Private Home',
      eventDate: '',
      startTime: '',
      endTime: '',
    });
  }
  if (event.Place3) {
    extras.push({
      place: event.Place3 === 'Private Home' ? '' : event.Place3,
      addressParts: splitAddress(event.Address3),
      isHouse: event.Place3 === 'Private Home',
      eventDate: '',
      startTime: '',
      endTime: '',
    });
  }
  return extras;
};

export function EventFormModal({ event, defaultDate, onClose, onSaved, onDeleted }: EventFormModalProps) {
  const isEditing = !!event;

  const [name, setName] = useState(event?.Name || '');
  const [category, setCategory] = useState(event?.Category || '');
  const [date, setDate] = useState(toDateInput(event?.EventDate || defaultDate || ''));
  const [startTime, setStartTime] = useState(toTimeInput(event?.Start || ''));
  const [endTime, setEndTime] = useState(toTimeInput(event?.End || ''));
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [place, setPlace] = useState(event?.Place === 'Private Home' ? '' : event?.Place || '');
  const [addressParts, setAddressParts] = useState<AddressParts>(() =>
    event?.Street || event?.City || event?.State || event?.Zip
      ? { street: event.Street || '', city: event.City || '', state: event.State || '', zip: event.Zip || '' }
      : splitAddress(event?.Address)
  );
  const [isHouseMain, setIsHouseMain] = useState(event?.Place === 'Private Home');
  const [extraLocations, setExtraLocations] = useState<ExtraLocationForm[]>(() => buildInitialExtraLocations(event));
  const [phone, setPhone] = useState(event?.Phone || '');
  const [charge, setCharge] = useState(event?.Charge != null ? String(event.Charge) : '');
  const [payment, setPayment] = useState(event?.Payment != null ? String(event.Payment) : '');
  const [paid, setPaid] = useState(event?.Paid === true || event?.Paid === 'True');
  const [ready, setReady] = useState(event?.Ready === true || event?.Ready === 'True');
  const [sent, setSent] = useState(event?.Sent === true || event?.Sent === 'True');
  const [info, setInfo] = useState(event?.Info || '');
  const [referral, setReferral] = useState(event?.Referral || '');
  const [simchaInitiative, setSimchaInitiative] = useState(event?.SimchaInitiative || false);
  const [projector, setProjector] = useState(event?.Projector || false);
  const [weinman, setWeinman] = useState(event?.Weinman || false);
  const [feedback, setFeedback] = useState(event?.Feedback || '');
  const [ratings, setRatings] = useState<number | null>(event?.Ratings ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [calendarEventId, setCalendarEventId] = useState(event?.CalendarEventId || '');
  const [isExportingCalendar, setIsExportingCalendar] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const balance = parseAmount(charge) - parseAmount(payment);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!isHouseMain && place.trim() && !addressParts.street.trim()) {
      setError(`Please enter a street address for "${place.trim()}".`);
      return;
    }
    for (const loc of extraLocations) {
      if (!loc.isHouse && loc.place.trim() && !loc.addressParts.street.trim()) {
        setError(`Please enter a street address for "${loc.place.trim()}".`);
        return;
      }
    }
    setIsSaving(true);
    setError('');
    try {
      const resolvedStart = startTime ? `${startTime}:00` : '';
      const resolvedEnd = endTime ? `${endTime}:00` : '';
      const extra1 = extraLocations[0];
      const extra2 = extraLocations[1];
      const payload: Partial<Event> = {
        Name: name.trim(),
        Category: category,
        EventDate: date ? `${date}T12:00:00` : '',
        Start: resolvedStart,
        End: resolvedEnd,
        Place: isHouseMain ? 'Private Home' : place,
        Address: isHouseMain ? '' : buildAddress(addressParts),
        Street: isHouseMain ? '' : addressParts.street.trim(),
        City: isHouseMain ? '' : addressParts.city.trim(),
        State: isHouseMain ? '' : addressParts.state.trim(),
        Zip: isHouseMain ? '' : addressParts.zip.trim(),
        Place2: extra1 ? (extra1.isHouse ? 'Private Home' : extra1.place.trim()) : '',
        Address2: extra1 ? (extra1.isHouse ? '' : buildAddress(extra1.addressParts)) : '',
        Place3: extra2 ? (extra2.isHouse ? 'Private Home' : extra2.place.trim()) : '',
        Address3: extra2 ? (extra2.isHouse ? '' : buildAddress(extra2.addressParts)) : '',
        Phone: phone.trim(),
        Charge: parseAmount(charge),
        Payment: parseAmount(payment),
        Bal: String(balance),
        Paid: paid,
        Ready: ready,
        Sent: sent,
        Info: info.trim(),
        Referral: referral.trim() || null,
        SimchaInitiative: simchaInitiative,
        Projector: projector,
        Weinman: weinman,
        Feedback: feedback.trim() || null,
        Ratings: ratings,
      };
      const saved = isEditing ? await updateEvent(event!.id, payload) : await createEvent(payload);

      const locationRows: Omit<EventLocation, 'id' | 'eventId'>[] = [
        {
          place: payload.Place as string,
          address: (payload.Address as string) || '',
          street: (payload.Street as string) || '',
          city: (payload.City as string) || '',
          state: (payload.State as string) || '',
          zip: (payload.Zip as string) || '',
          eventDate: date,
          startTime: resolvedStart,
          endTime: resolvedEnd,
          sortOrder: 0,
        },
        ...extraLocations
          .filter((loc) => loc.isHouse || loc.place.trim())
          .map((loc, i) => ({
            place: loc.isHouse ? 'Private Home' : loc.place.trim(),
            address: loc.isHouse ? '' : buildAddress(loc.addressParts),
            street: loc.isHouse ? '' : loc.addressParts.street.trim(),
            city: loc.isHouse ? '' : loc.addressParts.city.trim(),
            state: loc.isHouse ? '' : loc.addressParts.state.trim(),
            zip: loc.isHouse ? '' : loc.addressParts.zip.trim(),
            eventDate: loc.eventDate,
            startTime: loc.startTime ? `${loc.startTime}:00` : '',
            endTime: loc.endTime ? `${loc.endTime}:00` : '',
            sortOrder: i + 1,
          })),
      ];
      const savedLocations = await saveEventLocations(saved.id, locationRows);

      onSaved({ ...saved, locations: savedLocations });
    } catch (err) {
      console.error(err);
      setError('Failed to save event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateExtraLocation = (idx: number, patch: Partial<ExtraLocationForm>) => {
    setExtraLocations((prev) => prev.map((loc, i) => (i === idx ? { ...loc, ...patch } : loc)));
  };

  const removeExtraLocation = (idx: number) => {
    setExtraLocations((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleExportCalendar = async () => {
    if (!event) return;
    setIsExportingCalendar(true);
    setCalendarMessage('');
    try {
      const result = await exportToGoogleCalendar(event, calendarEventId || undefined);
      if (result.result === 'success') {
        setCalendarEventId(result.calendarEventId || '');
        await updateEvent(event.id, { CalendarEventId: result.calendarEventId });
        // Without this, the parent's in-memory event still has the old/empty CalendarEventId —
        // closing and reopening this event would re-export instead of replacing, since the
        // modal would think nothing had been exported yet and skip deleting the old entry.
        onSaved({ ...event, CalendarEventId: result.calendarEventId });
        setCalendarMessage(
          result.deleteWarning
            ? `✓ Exported, but the old entry couldn't be removed (${result.deleteWarning}) — check Google Calendar for a duplicate`
            : '✓ Exported to Google Calendar'
        );
      } else if (result.result === 'needsReauth') {
        setCalendarMessage('Google sign-in needed — opening sign-in page…');
        await startGoogleAuth();
      } else {
        setCalendarMessage('Export failed. Please try again.');
      }
    } catch {
      setCalendarMessage('Export failed. Please try again.');
    } finally {
      setIsExportingCalendar(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!confirm(`Delete "${event.Name}"? This can't be undone.`)) return;
    try {
      await deleteEvent(event.id);
      onDeleted(event.id);
    } catch {
      setError('Failed to delete event. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-bg-secondary shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-text-primary">{isEditing ? 'Edit Event' : 'New Event'}</h2>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                onClick={handleDelete}
                className="rounded-lg p-2 text-text-tertiary hover:bg-danger/10 hover:text-danger"
                title="Delete event"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-2 text-text-tertiary hover:bg-card hover:text-text-primary">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Event / client name"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
              autoFocus
            />
          </div>

          <CategoryPicker category={category} onChange={setCategory} />

          <div className="rounded-lg border border-border bg-card-alt/40 p-3">
            <div className="mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Location 1
              </span>
            </div>

            {(!place || isHouseMain) && (
              <button
                type="button"
                onClick={() => {
                  const next = !isHouseMain;
                  setIsHouseMain(next);
                  if (next) setPlace('');
                }}
                className={`mb-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isHouseMain ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card text-text-tertiary hover:text-text-primary'
                }`}
              >
                🏠 {isHouseMain ? 'Private Home selected' : 'Mark as Private Home'}
              </button>
            )}
            {isHouseMain ? (
              <div className="mb-2 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary">
                <span>🏠 Private Home</span>
                <button type="button" onClick={() => setIsHouseMain(false)} className="text-primary/70 hover:text-primary">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="mb-2">
                <PlacePicker place={place} addressParts={addressParts} onChange={(p, parts) => { setPlace(p); setAddressParts(parts); }} />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Start</label>
                <div className="relative">
                  <input
                    type="time"
                    step="300"
                    value={startTime}
                    onFocus={() => {
                      if (!startTime) setStartTime('18:30');
                    }}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setSelectedDuration(null);
                    }}
                    className="w-full rounded-lg border border-border bg-card px-2.5 py-2 pr-7 text-sm text-text-primary focus:border-primary focus:outline-none [color-scheme:dark]"
                  />
                  {startTime && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime('');
                        setSelectedDuration(null);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-danger"
                      aria-label="Clear start time"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">End</label>
                <div className="relative">
                  <input
                    type="time"
                    step="300"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setSelectedDuration(null);
                    }}
                    className="w-full rounded-lg border border-border bg-card px-2.5 py-2 pr-7 text-sm text-text-primary focus:border-primary focus:outline-none [color-scheme:dark]"
                  />
                  {endTime && (
                    <button
                      type="button"
                      onClick={() => {
                        setEndTime('');
                        setSelectedDuration(null);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-danger"
                      aria-label="Clear end time"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4].map((hrs) => (
                <button
                  key={hrs}
                  type="button"
                  disabled={!startTime}
                  onClick={() => {
                    setEndTime(addHoursToTime(startTime, hrs));
                    setSelectedDuration(hrs);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    selectedDuration === hrs
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border text-text-secondary hover:border-primary/50 hover:text-text-primary'
                  }`}
                >
                  {hrs} {hrs === 1 ? 'hr' : 'hrs'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {extraLocations.map((loc, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-card-alt/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    Location {idx + 2}
                  </span>
                  <button type="button" onClick={() => removeExtraLocation(idx)} className="text-text-tertiary hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>

                {(!loc.place || loc.isHouse) && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = !loc.isHouse;
                      updateExtraLocation(idx, { isHouse: next, place: next ? '' : loc.place });
                    }}
                    className={`mb-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      loc.isHouse ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card text-text-tertiary hover:text-text-primary'
                    }`}
                  >
                    🏠 {loc.isHouse ? 'Private Home selected' : 'Mark as Private Home'}
                  </button>
                )}
                {loc.isHouse ? (
                  <div className="mb-2 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary">
                    <span>🏠 Private Home</span>
                    <button type="button" onClick={() => updateExtraLocation(idx, { isHouse: false })} className="text-primary/70 hover:text-primary">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="mb-2">
                    <PlacePicker
                      place={loc.place}
                      addressParts={loc.addressParts}
                      onChange={(p, parts) => updateExtraLocation(idx, { place: p, addressParts: parts })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">Date (if different)</label>
                    <input
                      type="date"
                      value={loc.eventDate}
                      onChange={(e) => updateExtraLocation(idx, { eventDate: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">Start</label>
                    <div className="relative">
                      <input
                        type="time"
                        step="300"
                        value={loc.startTime}
                        onChange={(e) => updateExtraLocation(idx, { startTime: e.target.value })}
                        className="w-full rounded-lg border border-border bg-card px-2.5 py-2 pr-7 text-sm text-text-primary focus:border-primary focus:outline-none [color-scheme:dark]"
                      />
                      {loc.startTime && (
                        <button
                          type="button"
                          onClick={() => updateExtraLocation(idx, { startTime: '' })}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-danger"
                          aria-label="Clear start time"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">End</label>
                    <div className="relative">
                      <input
                        type="time"
                        step="300"
                        value={loc.endTime}
                        onChange={(e) => updateExtraLocation(idx, { endTime: e.target.value })}
                        className="w-full rounded-lg border border-border bg-card px-2.5 py-2 pr-7 text-sm text-text-primary focus:border-primary focus:outline-none [color-scheme:dark]"
                      />
                      {loc.endTime && (
                        <button
                          type="button"
                          onClick={() => updateExtraLocation(idx, { endTime: '' })}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-danger"
                          aria-label="Clear end time"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      disabled={!loc.startTime}
                      onClick={() => updateExtraLocation(idx, { endTime: addHoursToTime(loc.startTime, hrs) })}
                      className="rounded-full border border-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-primary/50 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {hrs} {hrs === 1 ? 'hr' : 'hrs'}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {extraLocations.length < 2 && (
              <button
                type="button"
                onClick={() => setExtraLocations((prev) => [...prev, emptyExtraLocation()])}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-light"
              >
                <Plus size={15} /> Add another location
              </button>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-5555"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Charge</label>
              <input
                type="number"
                value={charge}
                onChange={(e) => setCharge(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Payment</label>
              <input
                type="number"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Balance</label>
              <div
                className={`w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm ${
                  balance > 0 ? 'text-warning' : 'text-success'
                }`}
              >
                ${balance.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {([
              ['Paid', paid, setPaid],
              ['Ready', ready, setReady],
              ['Sent', sent, setSent],
            ] as const).map(([label, val, setter]) => (
              <button
                key={label}
                type="button"
                onClick={() => setter(!val)}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  val
                    ? 'border-success/50 bg-success/15 text-success'
                    : 'border-border bg-card text-text-tertiary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {([
              ['Simcha Initiative', simchaInitiative, setSimchaInitiative],
              ['Projector', projector, setProjector],
              ['Weinman', weinman, setWeinman],
            ] as const).map(([label, val, setter]) => (
              <button
                key={label}
                type="button"
                onClick={() => setter(!val)}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  val ? 'border-purple/50 bg-purple/15 text-purple' : 'border-border bg-card text-text-tertiary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Referral</label>
            <input
              value={referral ?? ''}
              onChange={(e) => setReferral(e.target.value)}
              placeholder="Who referred this booking?"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Notes</label>
            <textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              rows={3}
              placeholder="Additional info…"
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              placeholder="Customer feedback…"
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatings(ratings === star ? null : star)}
                  className="text-text-tertiary hover:text-warning"
                >
                  <Star size={22} fill={ratings != null && star <= ratings ? 'currentColor' : 'none'} className={ratings != null && star <= ratings ? 'text-warning' : ''} />
                </button>
              ))}
              {ratings != null && (
                <button type="button" onClick={() => setRatings(null)} className="ml-2 text-xs text-text-tertiary hover:text-text-primary">
                  Clear
                </button>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="rounded-lg border border-border bg-card px-3 py-3">
              <button
                type="button"
                onClick={handleExportCalendar}
                disabled={isExportingCalendar}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarPlus size={15} />
                {isExportingCalendar
                  ? 'Exporting…'
                  : calendarEventId
                  ? 'Re-export to Google Calendar'
                  : 'Export to Google Calendar'}
              </button>
              {calendarMessage && <p className="mt-2 text-center text-xs text-text-secondary">{calendarMessage}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-card">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={15} />
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
