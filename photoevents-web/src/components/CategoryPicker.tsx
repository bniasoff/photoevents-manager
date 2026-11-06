import { useEffect, useRef, useState } from 'react';
import { Trash2, X, ChevronDown, Plus } from 'lucide-react';
import { deleteCategory, fetchCategories, saveCategory } from '../lib/api';
import { getCategoryIcon } from '../types/Event';

interface CategoryPickerProps {
  category: string;
  onChange: (category: string) => void;
}

export function CategoryPicker({ category, onChange }: CategoryPickerProps) {
  const [dbCategories, setDbCategories] = useState<string[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories().then(setDbCategories);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const allCategories = dbCategories || [];
  const filtered = search
    ? allCategories.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : allCategories;
  const canAdd =
    search.trim() && !allCategories.some((c) => c.toLowerCase() === search.trim().toLowerCase());

  const selectCategory = (c: string) => {
    onChange(c);
    setSearch('');
    setIsOpen(false);
  };

  const confirmAddCategory = async () => {
    const c = search.trim();
    if (!c) return;
    onChange(c);
    setDbCategories((prev) => [...(prev || []), c]);
    setSearch('');
    setIsOpen(false);
    await saveCategory(c);
  };

  const handleDelete = async (c: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove "${c}" from the category list? This can't be undone.`)) return;
    try {
      await deleteCategory(c);
      setDbCategories((prev) => (prev || []).filter((x) => x !== c));
      if (category === c) onChange('');
    } catch {
      alert('Failed to delete category. Please try again.');
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-text-secondary">Category</label>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm text-text-primary hover:border-primary/60"
      >
        {category ? (
          <span className="flex items-center gap-2 truncate">
            <span>{getCategoryIcon(category)}</span>
            <span className="truncate">{category}</span>
          </span>
        ) : (
          <span className="text-text-tertiary">Select a category…</span>
        )}
        <ChevronDown size={16} className={`shrink-0 text-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-primary bg-card shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or add a category…"
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-text-tertiary hover:text-text-primary">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.map((c) => (
              <div key={c} className="group flex items-center justify-between px-3 py-2 hover:bg-card-alt">
                <button
                  type="button"
                  onClick={() => selectCategory(c)}
                  className={`flex flex-1 items-center gap-2 truncate text-left text-sm ${
                    c === category ? 'font-semibold text-primary' : 'text-text-primary'
                  }`}
                >
                  <span>{getCategoryIcon(c)}</span>
                  <span className="truncate">{c}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(c, e)}
                  className="ml-2 shrink-0 text-text-tertiary opacity-0 hover:text-danger group-hover:opacity-100"
                  title={`Delete ${c}`}
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
              <button
                type="button"
                onClick={confirmAddCategory}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-sm font-semibold text-white"
              >
                <Plus size={14} /> Add "{search.trim()}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
