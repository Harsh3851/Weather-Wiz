import { Info, X } from 'lucide-react';
import { useState } from 'react';
import { IS_DEMO, README_URL } from '@/lib/config';
import { STORAGE_KEYS, storage } from '@/lib/storage';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(() =>
    storage.get(STORAGE_KEYS.demoBannerDismissed, false),
  );
  if (!IS_DEMO || dismissed) return null;
  return (
    <div role="note" className="border-b border-border/70 bg-surface-2/70 text-xs text-muted">
      <div className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2 sm:items-center sm:px-6">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0" aria-hidden />
        <p className="flex-1">
          <span className="font-semibold text-fg">Demo mode</span> — calls Open-Meteo directly and
          stores favourites in your browser.{' '}
          <a
            href={README_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Run locally for the full Node.js + MongoDB backend.
          </a>
        </p>
        <button
          type="button"
          onClick={() => {
            storage.set(STORAGE_KEYS.demoBannerDismissed, true);
            setDismissed(true);
          }}
          className="rounded p-0.5 hover:text-fg"
          aria-label="Dismiss demo mode notice"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
