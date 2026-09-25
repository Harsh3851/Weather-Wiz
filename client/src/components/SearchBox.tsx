import type { GeoLocation, RecentSearch } from '@weatherwiz/shared';
import { clsx } from 'clsx';
import { Clock, Loader2, MapPin, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useGeocode } from '@/hooks/useWeather';
import { errorMessage } from '@/lib/api/errors';
import type { Place } from '@/lib/place';

const NO_RECENTS: RecentSearch[] = [];

interface Option {
  key: string;
  place: Place;
  kind: 'result' | 'recent';
}

function toPlace(r: GeoLocation | RecentSearch): Place {
  return {
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    countryCode: r.countryCode,
    admin1: r.admin1,
    timezone: 'timezone' in r ? r.timezone : null,
  };
}

/**
 * City search following the WAI-ARIA combobox pattern: debounced
 * autocomplete, arrow-key navigation, Enter to select, Escape to close.
 */
export function SearchBox({
  onSelect,
  recents = NO_RECENTS,
  label = 'Search for a city',
  placeholder = 'Search city, e.g. Noida',
  className,
  inputId,
}: {
  onSelect: (place: Place) => void;
  recents?: RecentSearch[];
  label?: string;
  placeholder?: string;
  className?: string;
  inputId?: string;
}) {
  const generatedId = useId();
  const id = inputId ?? `search-${generatedId}`;
  const listId = `${id}-listbox`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const debounced = useDebouncedValue(query, 300);
  const searching = debounced.trim().length >= 2;
  const geocode = useGeocode(debounced);
  const pending = query.trim().length >= 2 && (query !== debounced || geocode.isFetching);

  const options = useMemo<Option[]>(() => {
    if (!searching) {
      return recents
        .slice(0, 5)
        .map((r) => ({ key: `recent-${r.id}`, place: toPlace(r), kind: 'recent' }));
    }
    return (geocode.data ?? []).map((r, i) => ({
      key: `result-${r.id ?? i}-${r.latitude}-${r.longitude}`,
      place: toPlace(r),
      kind: 'result',
    }));
  }, [searching, recents, geocode.data]);

  // Reset the highlight only when the set of options actually changes.
  const optionsKey = options.map((o) => o.key).join('|');
  useEffect(() => setActive(optionsKey ? 0 : -1), [optionsKey]);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, []);

  const choose = (option: Option | undefined) => {
    if (!option) return;
    onSelect(option.place);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setOpen(true);
        setActive((i) => (options.length ? (i + 1) % options.length : -1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setOpen(true);
        setActive((i) => (options.length ? (i - 1 + options.length) % options.length : -1));
        break;
      case 'Enter':
        if (open && active >= 0) {
          e.preventDefault();
          choose(options[active]);
        }
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          setOpen(false);
        } else {
          setQuery('');
        }
        break;
    }
  };

  const showPanel = open && (options.length > 0 || searching);
  const activeId = active >= 0 && options[active] ? `${id}-opt-${active}` : undefined;

  return (
    <div ref={rootRef} className={clsx('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-activedescendant={showPanel ? activeId : undefined}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="input h-11 rounded-2xl pl-9 pr-9"
      />
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted" aria-label="Searching" />
        ) : query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="rounded-md p-0.5 text-muted hover:text-fg"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div
        className={clsx(
          'absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl',
          !showPanel && 'hidden',
        )}
      >
        {!searching && options.length > 0 && (
          <p className="px-3 pb-1 pt-2.5 text-xs font-medium uppercase tracking-wide text-muted">
            Recent searches
          </p>
        )}
        <ul
          id={listId}
          role="listbox"
          aria-label={searching ? 'Matching cities' : 'Recent searches'}
          className="max-h-80 overflow-y-auto py-1"
        >
          {options.map((o, i) => (
            <li
              key={o.key}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              onMouseEnter={() => setActive(i)}
              className={clsx(
                'flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm',
                i === active && 'bg-surface-2',
              )}
            >
              {o.kind === 'recent' ? (
                <Clock className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              ) : (
                <MapPin className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{o.place.name}</span>
                <span className="block truncate text-xs text-muted">
                  {[o.place.admin1, o.place.country].filter(Boolean).join(', ') || 'Unknown region'}
                </span>
              </span>
              {o.place.countryCode && (
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                  {o.place.countryCode}
                </span>
              )}
            </li>
          ))}
        </ul>
        {searching && !pending && geocode.isError && (
          <p role="status" className="px-3 py-3 text-sm text-danger">
            {errorMessage(geocode.error, 'Search failed')}
          </p>
        )}
        {searching && !pending && !geocode.isError && options.length === 0 && (
          <p role="status" className="px-3 py-3 text-sm text-muted">
            No places match “{debounced.trim()}”.
          </p>
        )}
      </div>
    </div>
  );
}
