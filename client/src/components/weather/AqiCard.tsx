import type { AirQuality, AqiCategoryKey } from '@weatherwiz/shared';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/States';

/** Status colours for the EPA scale; always shown with the text label. */
const TONE: Record<AqiCategoryKey, string> = {
  good: '#16a34a',
  moderate: '#ca8a04',
  sensitive: '#ea580c',
  unhealthy: '#dc2626',
  'very-unhealthy': '#9333ea',
  hazardous: '#7f1d1d',
};

const SEGMENTS: { to: number; key: AqiCategoryKey }[] = [
  { to: 50, key: 'good' },
  { to: 100, key: 'moderate' },
  { to: 150, key: 'sensitive' },
  { to: 200, key: 'unhealthy' },
  { to: 300, key: 'very-unhealthy' },
  { to: 500, key: 'hazardous' },
];

const R = 70;
const CX = 90;
const CY = 86;

function polar(value: number) {
  // Map 0..300 (clamped) to 180°..0° on a semicircle; beyond 300 pins to the end.
  const t = Math.min(value, 300) / 300;
  const angle = Math.PI * (1 - t);
  return { x: CX + R * Math.cos(angle), y: CY - R * Math.sin(angle) };
}

function arc(from: number, to: number) {
  const a = polar(from);
  const b = polar(to);
  return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`;
}

function Pollutant({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-semibold tabular">
        {value === null ? '–' : Math.round(value * 10) / 10}{' '}
        <span className="text-xs font-normal text-muted">µg/m³</span>
      </dd>
    </div>
  );
}

export function AqiCard({
  data,
  isLoading,
  error,
  onRetry,
}: {
  data?: AirQuality;
  isLoading: boolean;
  error?: unknown;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <Card title="Air quality" subtitle="US AQI">
        <div className="skeleton mx-auto h-24 w-44 rounded-t-full" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="skeleton h-12" />
          <div className="skeleton h-12" />
        </div>
      </Card>
    );
  }
  if (error || !data) {
    return (
      <Card title="Air quality" subtitle="US AQI">
        <ErrorState
          compact
          title="Air quality unavailable"
          message="The air quality service did not respond."
          onRetry={onRetry}
        />
      </Card>
    );
  }

  const aqi = data.usAqi;
  const cat = data.category;
  const needle = aqi !== null ? polar(aqi) : null;
  const color = cat ? TONE[cat.key] : '#94a3b8';

  return (
    <Card title="Air quality" subtitle="US AQI · PM2.5 and PM10">
      <figure className="flex flex-col items-center">
        <svg
          viewBox="0 0 180 100"
          className="w-full max-w-[220px]"
          role="img"
          aria-label={
            aqi !== null
              ? `Air quality index ${aqi}, ${cat?.label}`
              : 'Air quality index unavailable'
          }
        >
          {SEGMENTS.filter((s) => s.to <= 300).map((s, i, arr) => (
            <path
              key={s.key}
              d={arc(i === 0 ? 0 : arr[i - 1]!.to + 1.5, s.to - 1.5)}
              stroke={TONE[s.key]}
              strokeOpacity={0.25}
              strokeWidth={12}
              fill="none"
              strokeLinecap="butt"
            />
          ))}
          {aqi !== null && (
            <path
              d={arc(0, Math.max(Math.min(aqi, 300), 2))}
              stroke={color}
              strokeWidth={12}
              fill="none"
              strokeLinecap="round"
            />
          )}
          {needle && (
            <circle
              cx={needle.x}
              cy={needle.y}
              r={7}
              fill={color}
              stroke="rgb(var(--surface))"
              strokeWidth={3}
            />
          )}
          <text
            x={CX}
            y={CY - 8}
            textAnchor="middle"
            className="fill-fg"
            style={{ fontSize: 30, fontWeight: 700 }}
          >
            {aqi ?? '–'}
          </text>
        </svg>
        <figcaption className="mt-1 text-center">
          <p className="text-sm font-semibold" style={{ color }}>
            {cat?.label ?? 'Unknown'}
          </p>
          {cat && <p className="mt-1 text-xs text-muted">{cat.advice}</p>}
        </figcaption>
      </figure>
      <dl className="mt-4 grid grid-cols-2 gap-2">
        <Pollutant label="PM2.5" value={data.pm2_5} />
        <Pollutant label="PM10" value={data.pm10} />
        <Pollutant label="Ozone (O₃)" value={data.ozone} />
        <Pollutant label="NO₂" value={data.nitrogenDioxide} />
      </dl>
    </Card>
  );
}
