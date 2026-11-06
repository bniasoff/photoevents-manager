import { useEffect, useRef, useState } from 'react';
import { MapPin, Trash2, X, ChevronDown, Plus } from 'lucide-react';
import { deletePlace, fetchPlaces, savePlace, type PlaceRecord } from '../lib/api';
import { REGION_DEFAULTS, DEFAULT_ADDRESS, type AddressParts } from '../lib/eventHelpers';

interface PlacePickerProps {
  place: string;
  addressParts: AddressParts;
  onChange: (place: string, parts: AddressParts) => void;
  region?: string;
}

export function PlacePicker({ place, addressParts, onChange, region = 'lakewood' }: PlacePickerProps) {
  const [dbPlaces, setDbPlaces] = useState<Record<string, PlaceRecord> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newZip, setNewZip] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const regionDefault = REGION_DEFAULTS[region] || DEFAULT_ADDRESS;

  useEffect(() => {
    fetchPlaces(region).then(setDbPlaces);
  }, [region]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const allPlaces = dbPlaces ? Object.keys(dbPlaces).sort() : [];
  const filtered = search
    ? allPlaces.filter((p) => p.toLowerCase().includes(search.toLowerCase()))
    : allPlaces;
  const canAdd =
    search.trim() && !allPlaces.some((p) => p.toLowerCase() === search.trim().toLowerCase());

  const openAddForm = () => {
    setNewStreet('');
    setNewCity(regionDefault.city);
    setNewState(regionDefault.state);
    setNewZip(regionDefault.zip);
  };

  const selectPlace = (p: string) => {
    const rec = dbPlaces?.[p];
    onChange(p, rec ? { street: rec.street, city: rec.city, state: rec.state, zip: rec.zip } : addressParts);
    setSearch('');
    setIsOpen(false);
  };

  const confirmAddPlace = async () => {
    const p = search.trim();
    const street = newStreet.trim();
    if (!p || !street) return;
    const parts: AddressParts = { street, city: newCity.trim(), state: newState.trim(), zip: newZip.trim() };
    onChange(p, parts);
    setDbPlaces((prev) => ({ ...(prev || {}), [p]: { address: '', ...parts } }));
    setSearch('');
    setIsOpen(false);
    await savePlace(p, parts, region);
  };

  const handleDelete = async (p: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove "${p}" and its address from the places directory? This can't be undone.`)) return;
    try {
      await deletePlace(p);
      setDbPlaces((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        delete next[p];
        return next;
      });
      if (place === p) onChange('', addressParts);
    } catch {
      alert('Failed to delete place. Please try again.');
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-text-secondary">Place</label>
      <button
        type="button"
        onClick={() => {
          if (!isOpen) openAddForm();
          setIsOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm text-text-primary hover:border-primary/60"
      >
        <span className="flex items-center gap-2 truncate">
          <MapPin size={15} className="shrink-0 text-text-tertiary" />
          {place ? <span className="truncate">{place}</span> : <span className="text-text-tertiary">Select a place…</span>}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-primary bg-card shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or add a place…"
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-text-tertiary hover:text-text-primary">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.map((p) => (
              <div
                key={p}
                className="group flex items-center justify-between px-3 py-2 hover:bg-card-alt"
              >
                <button
                  type="button"
                  onClick={() => selectPlace(p)}
                  className={`flex-1 truncate text-left text-sm ${p === place ? 'font-semibold text-primary' : 'text-text-primary'}`}
                >
                  {p}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(p, e)}
                  className="ml-2 shrink-0 text-text-tertiary opacity-0 hover:text-danger group-hover:opacity-100"
                  title={`Delete ${p}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {filtered.length === 0 && !canAdd && (
              <div className="px-3 py-3 text-sm text-text-tertiary">No matches</div>
            )}
          </div>
          {canAdd && (
            <div className="border-t border-border bg-bg-secondary p-3">
              <p className="mb-2 text-xs text-text-secondary">
                New place — address required to add "{search.trim()}"
              </p>
              <input
                autoFocus
                value={newStreet}
                onChange={(e) => setNewStreet(e.target.value)}
                placeholder="Street address"
                className="mb-2 w-full rounded-md border border-border bg-card px-2.5 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
              />
              <div className="mb-2 grid grid-cols-3 gap-2">
                <input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="City"
                  className="col-span-1 rounded-md border border-border bg-card px-2.5 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
                />
                <input
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  placeholder="State"
                  className="rounded-md border border-border bg-card px-2.5 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
                />
                <input
                  value={newZip}
                  onChange={(e) => setNewZip(e.target.value)}
                  placeholder="Zip"
                  className="rounded-md border border-border bg-card px-2.5 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
                />
              </div>
              <button
                type="button"
                disabled={!newStreet.trim()}
                onClick={confirmAddPlace}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-border"
              >
                <Plus size={14} /> Add Place
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 grid grid-cols-3 gap-2">
        <input
          value={addressParts.street}
          onChange={(e) => onChange(place, { ...addressParts, street: e.target.value })}
          placeholder="Street address"
          className="col-span-3 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
        />
        <input
          value={addressParts.city}
          onChange={(e) => onChange(place, { ...addressParts, city: e.target.value })}
          placeholder="City"
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
        />
        <input
          value={addressParts.state}
          onChange={(e) => onChange(place, { ...addressParts, state: e.target.value })}
          placeholder="State"
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
        />
        <input
          value={addressParts.zip}
          onChange={(e) => onChange(place, { ...addressParts, zip: e.target.value })}
          placeholder="Zip"
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}
