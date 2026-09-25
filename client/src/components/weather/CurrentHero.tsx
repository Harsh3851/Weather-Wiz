import type { ConditionIcon, Forecast, Preferences } from '@weatherwiz/shared';
import { clsx } from 'clsx';
import { MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDate, formatTime, weekday } from '@/lib/format';
import { formatTemp } from '@/lib/units';
import type { Place } from '@/lib/place';
import { WeatherIcon } from './WeatherIcon';

function gradient(icon: ConditionIcon, isDay: boolean): string {
  if (!isDay) return 'from-slate-900 via-indigo-950 to-slate-800';
  switch (icon) {
    case 'clear':
      return 'from-sky-500 via-sky-600 to-indigo-600';
    case 'partly-cloudy':
      return 'from-sky-500 via-blue-600 to-slate-600';
    case 'thunderstorm':
      return 'from-slate-700 via-slate-800 to-indigo-900';
    case 'rain':
    case 'showers':
    case 'drizzle':
    case 'freezing-rain':
      return 'from-slate-500 via-slate-600 to-blue-800';
    case 'snow':
    case 'snow-showers':
      return 'from-sky-300 via-slate-400 to-slate-600';
    default:
      return 'from-slate-500 via-slate-600 to-slate-700';
  }
}

export function CurrentHero({
  place,
  forecast,
  prefs,
  actions,
}: {
  place: Place;
  forecast: Forecast;
  prefs: Preferences;
  actions?: ReactNode;
}) {
  const { current } = forecast;
  const today = forecast.daily[0];
  const unit = prefs.temperatureUnit;
  const subtitle = [place.admin1, place.country].filter(Boolean).join(', ');

  return (
    <section
      aria-labelledby="current-heading"
      className={clsx(
        'relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-card sm:p-7',
        gradient(current.condition.icon, current.isDay),
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            id="current-heading"
            className="flex items-center gap-1.5 truncate text-xl font-semibold sm:text-2xl"
          >
            <MapPin className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
            <span className="truncate">{place.name}</span>
          </h1>
          {subtitle && <p className="mt-0.5 truncate text-sm text-white/75">{subtitle}</p>}
          <p className="mt-1 text-sm text-white/75 tabular">
            {weekday(current.time)}, {formatDate(current.time)} ·{' '}
            {formatTime(current.time, prefs.timeFormat)}{' '}
            <span className="text-white/60">({forecast.timezoneAbbreviation})</span>
          </p>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      <div className="relative mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p
            className="text-7xl font-light leading-none tracking-tight tabular sm:text-8xl"
            aria-label={`Temperature ${formatTemp(current.temperature, unit, true)}`}
          >
            {formatTemp(current.temperature, unit)}
          </p>
          <p className="mt-3 text-lg font-medium">{current.condition.label}</p>
          <p className="mt-1 text-sm text-white/80 tabular">
            Feels like {formatTemp(current.apparentTemperature, unit)}
            {today && (
              <>
                {' '}
                · H {formatTemp(today.temperatureMax, unit)} · L{' '}
                {formatTemp(today.temperatureMin, unit)}
              </>
            )}
          </p>
        </div>
        <WeatherIcon
          icon={current.condition.icon}
          isDay={current.isDay}
          animated
          className="h-28 w-28 drop-shadow-lg sm:h-36 sm:w-36"
          label={current.condition.label}
        />
      </div>
    </section>
  );
}

export function CurrentHeroSkeleton() {
  return (
    <div
      className="rounded-3xl bg-gradient-to-br from-slate-300 to-slate-400 p-7 dark:from-slate-800 dark:to-slate-700"
      aria-hidden
    >
      <div className="skeleton h-7 w-48 bg-white/30" />
      <div className="skeleton mt-2 h-4 w-64 bg-white/20" />
      <div className="skeleton mt-8 h-20 w-40 bg-white/30" />
      <div className="skeleton mt-4 h-5 w-56 bg-white/20" />
    </div>
  );
}
