import type { Forecast, Preferences } from '@weatherwiz/shared';
import { clsx } from 'clsx';
import { Droplets, Eye, Gauge, Navigation, Sun, Thermometer, Wind } from 'lucide-react';
import type { ReactNode } from 'react';
import { compass, formatTemp, formatVisibility, formatWind, uvLevel } from '@/lib/units';

function Tile({
  icon,
  label,
  value,
  hint,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="card flex min-h-[112px] flex-col justify-between p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <p className="whitespace-nowrap text-2xl font-semibold tabular lg:text-xl xl:text-2xl">
            {value}
          </p>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Highlights({ forecast, prefs }: { forecast: Forecast; prefs: Preferences }) {
  const c = forecast.current;
  const uv = uvLevel(c.uvIndex);
  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-3"
      role="list"
      aria-label="Current conditions"
    >
      <div role="listitem">
        <Tile
          icon={<Thermometer className="h-4 w-4" />}
          label="Feels like"
          value={formatTemp(c.apparentTemperature, prefs.temperatureUnit, true)}
          hint={
            c.apparentTemperature > c.temperature + 1
              ? 'Humidity makes it feel warmer'
              : c.apparentTemperature < c.temperature - 1
                ? 'Wind makes it feel cooler'
                : 'Similar to the actual temperature'
          }
        />
      </div>
      <div role="listitem">
        <Tile
          icon={<Droplets className="h-4 w-4" />}
          label="Humidity"
          value={`${Math.round(c.humidity)}%`}
          hint={
            c.dewPoint !== null
              ? `Dew point ${formatTemp(c.dewPoint, prefs.temperatureUnit)}`
              : undefined
          }
        >
          <div
            className="flex h-12 w-2 flex-col justify-end overflow-hidden rounded-full bg-surface-2"
            aria-hidden
          >
            <div className="w-full rounded-full bg-sky-500" style={{ height: `${c.humidity}%` }} />
          </div>
        </Tile>
      </div>
      <div role="listitem">
        <Tile
          icon={<Wind className="h-4 w-4" />}
          label="Wind"
          value={formatWind(c.windSpeed, prefs.windUnit)}
          hint={`Gusts ${formatWind(c.windGusts, prefs.windUnit)} · ${compass(c.windDirection)}`}
        >
          <Navigation
            className="h-7 w-7 text-accent"
            style={{ transform: `rotate(${(c.windDirection + 180) % 360}deg)` }}
            aria-label={`Wind from ${compass(c.windDirection)}`}
          />
        </Tile>
      </div>
      <div role="listitem">
        <Tile
          icon={<Sun className="h-4 w-4" />}
          label="UV index"
          value={c.uvIndex === null ? '–' : c.uvIndex.toFixed(1)}
          hint={
            <span
              className={clsx(
                uv.tone === 'danger' && 'text-danger',
                uv.tone === 'warn' && 'text-warn',
              )}
            >
              {uv.label}
            </span>
          }
        />
      </div>
      <div role="listitem">
        <Tile
          icon={<Gauge className="h-4 w-4" />}
          label="Pressure"
          value={`${Math.round(c.pressure)}`}
          hint="hPa at sea level"
        />
      </div>
      <div role="listitem">
        <Tile
          icon={<Eye className="h-4 w-4" />}
          label="Visibility"
          value={formatVisibility(c.visibility)}
          hint={`Cloud cover ${Math.round(c.cloudCover)}%`}
        />
      </div>
    </div>
  );
}

export function HighlightsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="card h-[112px] p-4">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton mt-6 h-7 w-24" />
        </div>
      ))}
    </div>
  );
}
