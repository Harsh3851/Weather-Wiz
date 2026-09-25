import type { AirQuality, Forecast, Preferences } from '@weatherwiz/shared';
import { ArrowLeftRight } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SearchBox } from '@/components/SearchBox';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/States';
import { chartColors } from '@/components/weather/chartTheme';
import { WeatherIcon } from '@/components/weather/WeatherIcon';
import { usePreferences } from '@/hooks/usePreferences';
import { useIsDark } from '@/hooks/useTheme';
import { useRecentSearches } from '@/hooks/useUserCollections';
import { useAirQuality, useForecast } from '@/hooks/useWeather';
import { errorMessage } from '@/lib/api/errors';
import { dayLabel, formatShortDate, formatTime, placeSubtitle } from '@/lib/format';
import { placeFromParams, placeToParams, type Place } from '@/lib/place';
import { convertTemp, formatTemp, formatWind, tempUnitLabel } from '@/lib/units';

const DEFAULT_A: Place = {
  name: 'Noida',
  latitude: 28.58,
  longitude: 77.33,
  admin1: 'Uttar Pradesh',
  country: 'India',
  countryCode: 'IN',
};
const DEFAULT_B: Place = {
  name: 'Mumbai',
  latitude: 19.07,
  longitude: 72.88,
  admin1: 'Maharashtra',
  country: 'India',
  countryCode: 'IN',
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold tabular">{value}</dd>
    </div>
  );
}

function CityColumn({
  place,
  forecast,
  air,
  error,
  prefs,
  swatch,
  onRetry,
}: {
  place: Place;
  forecast?: Forecast;
  air?: AirQuality;
  error: unknown;
  prefs: Preferences;
  swatch: string;
  onRetry: () => void;
}) {
  if (error && !forecast) {
    return (
      <Card>
        <ErrorState
          title={`Could not load ${place.name}`}
          message={errorMessage(error)}
          onRetry={onRetry}
        />
      </Card>
    );
  }
  if (!forecast) {
    return (
      <div className="card space-y-3 p-5" aria-hidden>
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-16 w-28" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-6 w-full" />
        ))}
      </div>
    );
  }
  const c = forecast.current;
  const today = forecast.daily[0];
  return (
    <Card as="article" aria-label={`Weather in ${place.name}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 truncate text-lg font-semibold">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: swatch }}
              aria-hidden
            />
            {place.name}
          </h2>
          <p className="truncate text-xs text-muted">{placeSubtitle(place) || forecast.timezone}</p>
          <p className="mt-0.5 text-xs text-muted tabular">
            Local time {formatTime(c.time, prefs.timeFormat)}
          </p>
        </div>
        <WeatherIcon
          icon={c.condition.icon}
          isDay={c.isDay}
          className="h-14 w-14"
          animated
          label={c.condition.label}
        />
      </div>
      <p className="mt-3 text-5xl font-light tabular">
        {formatTemp(c.temperature, prefs.temperatureUnit)}
      </p>
      <p className="mt-1 text-sm font-medium">{c.condition.label}</p>
      <dl className="mt-3 divide-y divide-border/60">
        <Metric
          label="Feels like"
          value={formatTemp(c.apparentTemperature, prefs.temperatureUnit, true)}
        />
        {today && (
          <Metric
            label="Today high / low"
            value={`${formatTemp(today.temperatureMax, prefs.temperatureUnit)} / ${formatTemp(today.temperatureMin, prefs.temperatureUnit)}`}
          />
        )}
        <Metric label="Humidity" value={`${Math.round(c.humidity)}%`} />
        <Metric label="Wind" value={formatWind(c.windSpeed, prefs.windUnit)} />
        {today && (
          <Metric
            label="Chance of rain today"
            value={`${today.precipitationProbabilityMax ?? 0}%`}
          />
        )}
        <Metric label="UV index" value={c.uvIndex === null ? '–' : c.uvIndex.toFixed(1)} />
        <Metric
          label="Air quality (US AQI)"
          value={air?.usAqi != null ? `${air.usAqi} · ${air.category?.label ?? ''}` : '–'}
        />
        {today && (
          <Metric
            label="Sunrise / sunset"
            value={`${formatTime(today.sunrise, prefs.timeFormat)} / ${formatTime(today.sunset, prefs.timeFormat)}`}
          />
        )}
      </dl>
    </Card>
  );
}

export function ComparePage() {
  const [params, setParams] = useSearchParams();
  const { preferences: prefs } = usePreferences();
  const { recents } = useRecentSearches();
  const dark = useIsDark();
  const colors = chartColors(dark);

  const a = placeFromParams(params, 'a') ?? DEFAULT_A;
  const b = placeFromParams(params, 'b') ?? DEFAULT_B;

  const fa = useForecast(a.latitude, a.longitude);
  const fb = useForecast(b.latitude, b.longitude);
  const aa = useAirQuality(a.latitude, a.longitude);
  const ab = useAirQuality(b.latitude, b.longitude);

  useEffect(() => {
    document.title = `${a.name} vs ${b.name} · Weather Wiz`;
  }, [a.name, b.name]);

  const setPlaces = (nextA: Place, nextB: Place) => {
    const p = new URLSearchParams();
    placeToParams(nextA).forEach((v, k) => p.set(`a${k}`, v));
    placeToParams(nextB).forEach((v, k) => p.set(`b${k}`, v));
    setParams(p, { replace: true });
  };

  const rows = useMemo(() => {
    const da = fa.data?.data.daily ?? [];
    const db = fb.data?.data.daily ?? [];
    const today = da[0]?.date ?? '';
    return da.slice(0, 7).map((d, i) => ({
      label: `${dayLabel(d.date, today)} ${formatShortDate(d.date)}`,
      short: dayLabel(d.date, today),
      a: Math.round(convertTemp(d.temperatureMax, prefs.temperatureUnit)),
      b: db[i] ? Math.round(convertTemp(db[i].temperatureMax, prefs.temperatureUnit)) : null,
    }));
  }, [fa.data, fb.data, prefs.temperatureUnit]);

  const unit = tempUnitLabel(prefs.temperatureUnit);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compare cities</h1>
          <p className="text-sm text-muted">Current conditions and the week ahead, side by side.</p>
        </div>
      </div>

      <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
        <SearchBox
          inputId="compare-a"
          label="First city"
          placeholder={`Change ${a.name}`}
          recents={recents}
          onSelect={(p) => setPlaces(p, b)}
        />
        <Button
          size="icon"
          variant="secondary"
          className="mx-auto"
          aria-label="Swap cities"
          title="Swap cities"
          onClick={() => setPlaces(b, a)}
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
        <SearchBox
          inputId="compare-b"
          label="Second city"
          placeholder={`Change ${b.name}`}
          recents={recents}
          onSelect={(p) => setPlaces(a, p)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <CityColumn
          place={a}
          forecast={fa.data?.data}
          air={aa.data?.data}
          error={fa.error}
          prefs={prefs}
          swatch={colors.series1}
          onRetry={() => void fa.refetch()}
        />
        <CityColumn
          place={b}
          forecast={fb.data?.data}
          air={ab.data?.data}
          error={fb.error}
          prefs={prefs}
          swatch={colors.series2}
          onRetry={() => void fb.refetch()}
        />
      </div>

      <Card
        title={`Daily high temperature (${unit})`}
        subtitle="Next 7 days, each city in its local time"
      >
        {rows.length > 0 && fb.data ? (
          <>
            <div className="h-64 w-full" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 16, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={colors.grid} />
                  <XAxis
                    dataKey="short"
                    tick={{ fill: colors.axis, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: colors.axis, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={(v: number) => `${v}°`}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [`${v}${unit}`, name]}
                    labelFormatter={(_l, payload) =>
                      (payload?.[0]?.payload as { label?: string } | undefined)?.label ?? ''
                    }
                    contentStyle={{
                      background: colors.surface,
                      border: `1px solid ${colors.grid}`,
                      borderRadius: 12,
                      fontSize: 12,
                      color: colors.text,
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value: string) => (
                      <span style={{ color: colors.axis }}>{value}</span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="a"
                    name={a.name}
                    stroke={colors.series1}
                    strokeWidth={2}
                    dot={{ r: 4, fill: colors.series1, stroke: colors.surface, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="b"
                    name={b.name}
                    stroke={colors.series2}
                    strokeWidth={2}
                    dot={{ r: 4, fill: colors.series2, stroke: colors.surface, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <caption className="sr-only">Daily high temperature comparison</caption>
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th scope="col" className="py-1.5 font-medium">
                      Day
                    </th>
                    <th scope="col" className="py-1.5 font-medium">
                      {a.name}
                    </th>
                    <th scope="col" className="py-1.5 font-medium">
                      {b.name}
                    </th>
                    <th scope="col" className="py-1.5 font-medium">
                      Difference
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 tabular">
                  {rows.map((r) => (
                    <tr key={r.label}>
                      <td className="py-1.5">{r.label}</td>
                      <td className="py-1.5">{r.a}°</td>
                      <td className="py-1.5">{r.b ?? '–'}°</td>
                      <td className="py-1.5 text-muted">
                        {r.b === null ? '–' : `${r.a - r.b > 0 ? '+' : ''}${r.a - r.b}°`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="skeleton h-64 w-full" aria-hidden />
        )}
      </Card>
    </div>
  );
}
