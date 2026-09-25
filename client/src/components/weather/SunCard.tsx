import type { DailyPoint, Preferences } from '@weatherwiz/shared';
import { Sunrise, Sunset } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatDuration, formatTime, minutesOfDay } from '@/lib/format';

const W = 200;
const H = 96;
const R = 80;
const CX = W / 2;
const CY = 90;

/** Sunrise to sunset arc with the sun's current position (location's local time). */
export function SunCard({
  today,
  now,
  prefs,
}: {
  today: DailyPoint;
  now: string;
  prefs: Preferences;
}) {
  const rise = minutesOfDay(today.sunrise);
  const set = minutesOfDay(today.sunset);
  const cur = minutesOfDay(now);
  const progress = set > rise ? Math.min(Math.max((cur - rise) / (set - rise), 0), 1) : 0;
  const up = cur >= rise && cur <= set;
  const angle = Math.PI * (1 - progress);
  const sun = { x: CX + R * Math.cos(angle), y: CY - R * Math.sin(angle) };
  const remaining = Math.max(set - cur, 0);

  return (
    <Card title="Sunrise & sunset" subtitle={`Daylight ${formatDuration(today.daylightDuration)}`}>
      <svg
        viewBox={`0 0 ${W} ${H + 4}`}
        className="mx-auto w-full max-w-[280px]"
        role="img"
        aria-label={`Sunrise ${formatTime(today.sunrise, prefs.timeFormat)}, sunset ${formatTime(today.sunset, prefs.timeFormat)}`}
      >
        <line x1={4} x2={W - 4} y1={CY} y2={CY} stroke="rgb(var(--border))" strokeWidth={1.5} />
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="rgb(var(--muted) / 0.45)"
          strokeWidth={2}
          strokeDasharray="4 5"
        />
        {up && (
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${sun.x} ${sun.y}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}
        <circle
          cx={sun.x}
          cy={up ? sun.y : CY}
          r={8}
          fill={up ? '#f59e0b' : 'rgb(var(--muted))'}
          stroke="rgb(var(--surface))"
          strokeWidth={3}
        />
      </svg>
      <div className="mt-3 flex justify-between text-sm">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Sunrise className="h-4 w-4 text-amber-500" aria-hidden /> Sunrise
          </p>
          <p className="font-semibold tabular">{formatTime(today.sunrise, prefs.timeFormat)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted">
            {up ? 'Until sunset' : cur < rise ? 'Before sunrise' : 'After sunset'}
          </p>
          <p className="font-semibold tabular">{up ? formatDuration(remaining * 60) : '–'}</p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1.5 text-xs text-muted">
            Sunset <Sunset className="h-4 w-4 text-orange-500" aria-hidden />
          </p>
          <p className="font-semibold tabular">{formatTime(today.sunset, prefs.timeFormat)}</p>
        </div>
      </div>
    </Card>
  );
}
