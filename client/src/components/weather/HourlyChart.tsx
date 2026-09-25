import type { HourlyPoint, Preferences } from '@weatherwiz/shared';
import { useId, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { useIsDark } from '@/hooks/useTheme';
import { formatDate, formatHour, formatTime } from '@/lib/format';
import { convertTemp, tempUnitLabel } from '@/lib/units';
import { chartColors } from './chartTheme';
import { WeatherIcon } from './WeatherIcon';

interface Row {
  time: string;
  label: string;
  temp: number;
  precip: number;
  precipMm: number;
  point: HourlyPoint;
}

function HourTooltip({
  active,
  payload,
  prefs,
}: TooltipProps<number, string> & { prefs: Preferences }) {
  const row = payload?.[0]?.payload as Row | undefined;
  if (!active || !row) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <p className="font-semibold">
        {formatDate(row.time)} · {formatTime(row.time, prefs.timeFormat)}
      </p>
      <p className="mt-1 text-muted">{row.point.condition.label}</p>
      <p className="mt-1 tabular">
        Temperature{' '}
        <span className="font-semibold text-fg">
          {Math.round(row.temp)}
          {tempUnitLabel(prefs.temperatureUnit)}
        </span>
      </p>
      <p className="tabular">
        Chance of rain <span className="font-semibold text-fg">{row.precip}%</span>
        {row.precipMm > 0 && <span className="text-muted"> ({row.precipMm.toFixed(1)} mm)</span>}
      </p>
    </div>
  );
}

export function HourlyChart({ hourly, prefs }: { hourly: HourlyPoint[]; prefs: Preferences }) {
  const [range, setRange] = useState<'24' | '48'>('24');
  const dark = useIsDark();
  const colors = chartColors(dark);
  const gradientId = useId().replace(/:/g, '');

  const rows = useMemo<Row[]>(
    () =>
      hourly.slice(0, Number(range)).map((h) => ({
        time: h.time,
        label: formatHour(h.time, prefs.timeFormat),
        temp: Math.round(convertTemp(h.temperature, prefs.temperatureUnit) * 10) / 10,
        precip: h.precipitationProbability ?? 0,
        precipMm: h.precipitation,
        point: h,
      })),
    [hourly, range, prefs.temperatureUnit, prefs.timeFormat],
  );

  const temps = rows.map((r) => r.temp);
  const min = Math.floor(Math.min(...temps) - 2);
  const max = Math.ceil(Math.max(...temps) + 2);
  const interval = range === '24' ? 2 : 5;
  const tick = { fill: colors.axis, fontSize: 11 };
  const syncId = `hourly-${gradientId}`;

  return (
    <Card
      title="Hourly forecast"
      subtitle={`Temperature (${tempUnitLabel(prefs.temperatureUnit)}) and chance of rain, local time`}
      action={
        <Segmented
          label="Hours shown"
          hideLabel
          size="sm"
          value={range}
          onChange={setRange}
          options={[
            { value: '24', label: '24 h' },
            { value: '48', label: '48 h' },
          ]}
        />
      }
    >
      <div
        className="-mx-1 mb-3 flex gap-1 overflow-x-auto pb-1"
        aria-label="Hourly summary"
        role="list"
      >
        {rows
          .filter((_, i) => i % (range === '24' ? 3 : 6) === 0)
          .map((r) => (
            <div
              key={r.time}
              role="listitem"
              className="flex min-w-[56px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-xs"
            >
              <span className="text-muted tabular">{formatHour(r.time, prefs.timeFormat)}</span>
              <WeatherIcon
                icon={r.point.condition.icon}
                isDay={r.point.isDay}
                className="h-7 w-7"
                label={r.point.condition.label}
              />
              <span className="font-semibold tabular">{Math.round(r.temp)}°</span>
            </div>
          ))}
      </div>

      <div className="h-44 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={rows}
            syncId={syncId}
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.series1} stopOpacity={0.28} />
                <stop offset="100%" stopColor={colors.series1} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="label"
              tick={tick}
              tickLine={false}
              axisLine={false}
              interval={interval}
              hide
            />
            <YAxis
              domain={[min, max]}
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => `${v}°`}
            />
            <Tooltip
              content={<HourTooltip prefs={prefs} />}
              cursor={{ stroke: colors.axis, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="temp"
              stroke={colors.series1}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4, stroke: colors.surface, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mb-1 mt-3 text-xs font-medium text-muted">Chance of rain (%)</p>
      <div className="h-24 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            syncId={syncId}
            margin={{ top: 4, right: 8, left: -18, bottom: 0 }}
            barCategoryGap={2}
          >
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="label"
              tick={tick}
              tickLine={false}
              axisLine={false}
              interval={interval}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              content={<HourTooltip prefs={prefs} />}
              cursor={{ fill: colors.grid, opacity: 0.5 }}
            />
            <Bar
              dataKey="precip"
              fill={colors.precip}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="sr-only">
        <table>
          <caption>Hourly forecast for the next {range} hours</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Temperature</th>
              <th scope="col">Chance of rain</th>
              <th scope="col">Conditions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.time}>
                <td>
                  {formatDate(r.time)} {formatTime(r.time, prefs.timeFormat)}
                </td>
                <td>
                  {Math.round(r.temp)}
                  {tempUnitLabel(prefs.temperatureUnit)}
                </td>
                <td>{r.precip}%</td>
                <td>{r.point.condition.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
