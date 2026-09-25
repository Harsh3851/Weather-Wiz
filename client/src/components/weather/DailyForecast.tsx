import type { DailyPoint, Preferences } from '@weatherwiz/shared';
import { Droplets } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { dayLabel, formatShortDate } from '@/lib/format';
import { formatTemp, formatWind } from '@/lib/units';
import { WeatherIcon } from './WeatherIcon';

export function DailyForecast({ daily, prefs }: { daily: DailyPoint[]; prefs: Preferences }) {
  const [count, setCount] = useState<'7' | '14'>('7');
  const days = daily.slice(0, Number(count));
  const today = daily[0]?.date ?? '';
  const lo = Math.min(...days.map((d) => d.temperatureMin));
  const hi = Math.max(...days.map((d) => d.temperatureMax));
  const span = Math.max(hi - lo, 1);

  return (
    <Card
      title={`${count}-day forecast`}
      subtitle="Daily low and high with the chance of rain"
      action={
        daily.length > 7 ? (
          <Segmented
            label="Days shown"
            hideLabel
            size="sm"
            value={count}
            onChange={setCount}
            options={[
              { value: '7', label: '7 days' },
              { value: '14', label: '14 days' },
            ]}
          />
        ) : undefined
      }
    >
      <ul className="divide-y divide-border/60">
        {days.map((d) => {
          const left = ((d.temperatureMin - lo) / span) * 100;
          const width = Math.max(((d.temperatureMax - d.temperatureMin) / span) * 100, 4);
          const rain = d.precipitationProbabilityMax ?? 0;
          return (
            <li
              key={d.date}
              className="grid grid-cols-[minmax(0,5.5rem)_2.25rem_3.25rem_minmax(0,1fr)] items-center gap-2 py-2.5 sm:grid-cols-[7rem_2.5rem_4rem_minmax(0,1fr)_6rem] sm:gap-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{dayLabel(d.date, today)}</p>
                <p className="text-xs text-muted tabular">{formatShortDate(d.date)}</p>
              </div>
              <WeatherIcon icon={d.condition.icon} className="h-8 w-8" label={d.condition.label} />
              <p
                className={`flex items-center gap-1 text-xs tabular ${rain >= 50 ? 'font-semibold text-sky-600 dark:text-sky-400' : 'text-muted'}`}
                title="Chance of rain"
              >
                <Droplets className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Chance of rain</span>
                {rain}%
              </p>
              <div className="flex items-center gap-2 text-sm tabular">
                <span className="w-9 text-right text-muted">
                  {formatTemp(d.temperatureMin, prefs.temperatureUnit)}
                </span>
                <div className="relative h-1.5 flex-1 rounded-full bg-surface-2" aria-hidden>
                  <div
                    className="absolute h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-orange-500"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                </div>
                <span className="w-9 font-semibold">
                  {formatTemp(d.temperatureMax, prefs.temperatureUnit)}
                </span>
              </div>
              <p className="hidden text-right text-xs text-muted sm:block tabular">
                {formatWind(d.windSpeedMax, prefs.windUnit)}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
