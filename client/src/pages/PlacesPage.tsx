import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SavedLocation } from '@weatherwiz/shared';
import { clsx } from 'clsx';
import { Clock, ExternalLink, GripVertical, MapPin, Star, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useAuth } from '@/auth/AuthContext';
import { useSelectPlace } from '@/hooks/useSelectPlace';
import { useRecentSearches, useSavedLocations } from '@/hooks/useUserCollections';
import { errorMessage } from '@/lib/api/errors';
import { formatTimestampDate, placeSubtitle } from '@/lib/format';

function Row({
  location,
  onOpen,
  onDefault,
  onRemove,
}: {
  location: SavedLocation;
  onOpen: () => void;
  onDefault: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: location.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        'flex items-center gap-2 rounded-xl border border-border/70 bg-surface px-2 py-2 sm:gap-3 sm:px-3',
        isDragging && 'relative z-10 shadow-xl ring-2 ring-accent/40',
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="cursor-grab touch-none rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
        aria-label={`Reorder ${location.name}. Press space to pick up, arrow keys to move, space to drop.`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 rounded-lg text-left">
        <span className="flex items-center gap-1.5 truncate text-sm font-medium">
          {location.name}
          {location.isDefault && (
            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Default
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-muted">
          {placeSubtitle(location) || `${location.latitude}, ${location.longitude}`}
        </span>
      </button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onDefault}
        disabled={location.isDefault}
        aria-label={
          location.isDefault
            ? `${location.name} is your default`
            : `Make ${location.name} the default`
        }
        title={location.isDefault ? 'Default location' : 'Make default'}
      >
        <Star className={clsx('h-4 w-4', location.isDefault && 'fill-amber-400 text-amber-400')} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onOpen}
        aria-label={`Open ${location.name}`}
        title="Open on dashboard"
        className="hidden sm:inline-flex"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onRemove}
        aria-label={`Remove ${location.name}`}
        title="Remove"
        className="text-danger hover:bg-danger/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

export function PlacesPage() {
  const { query, locations, update, remove, reorder } = useSavedLocations();
  const { recents, clear } = useRecentSearches();
  const { user, accountsEnabled } = useAuth();
  const selectPlace = useSelectPlace();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    document.title = 'Saved places · Weather Wiz';
  }, []);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = locations.findIndex((l) => l.id === active.id);
    const to = locations.findIndex((l) => l.id === over.id);
    reorder.mutate(arrayMove(locations, from, to));
  };

  const storageNote = user
    ? `Synced to your account (${user.email}).`
    : accountsEnabled
      ? 'Stored in this browser. Sign in to sync across devices.'
      : 'Stored in this browser (demo mode).';

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Saved places</h1>
          <p className="text-sm text-muted">
            Drag to reorder. The default place opens first on the dashboard. {storageNote}
          </p>
        </div>
        <Card>
          {query.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="Could not load saved places"
              message={errorMessage(query.error)}
              onRetry={() => void query.refetch()}
            />
          ) : locations.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-6 w-6" />}
              title="No saved places yet"
              action={
                <Button
                  variant="primary"
                  onClick={() => document.getElementById('global-search')?.focus()}
                >
                  Search for a city
                </Button>
              }
            >
              Search for a city and tap the star on the dashboard to save it here.
            </EmptyState>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={locations.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2" aria-label="Saved places">
                  {locations.map((l) => (
                    <Row
                      key={l.id}
                      location={l}
                      onOpen={() => selectPlace(l, { record: false })}
                      onDefault={() => update.mutate({ id: l.id, patch: { isDefault: true } })}
                      onRemove={() => remove.mutate(l)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <div className="lg:pt-[3.75rem]">
          <Card
            title="Recent searches"
            action={
              recents.length > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => clear.mutate()}
                  loading={clear.isPending}
                >
                  Clear
                </Button>
              ) : undefined
            }
          >
            {recents.length === 0 ? (
              <EmptyState icon={<Clock className="h-5 w-5" />} title="Nothing searched yet">
                Cities you search for appear here.
              </EmptyState>
            ) : (
              <ul className="-mx-2 space-y-0.5">
                {recents.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => selectPlace(r)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2"
                    >
                      <Clock className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {placeSubtitle(r)}
                        </span>
                      </span>
                      <span className="text-xs text-muted tabular">
                        {formatTimestampDate(r.searchedAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        {!user && accountsEnabled && (
          <Card title="Sync across devices">
            <p className="text-sm text-muted">
              Create a free account to keep saved places, preferences and alert rules everywhere.
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                to="/register"
                className="inline-flex h-9 items-center rounded-xl bg-accent px-3 text-sm font-medium text-accent-fg"
              >
                Create account
              </Link>
              <Link
                to="/login"
                className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-sm font-medium"
              >
                Sign in
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
