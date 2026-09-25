import type { ConditionIcon } from '@weatherwiz/shared';
import { clsx } from 'clsx';

interface Props {
  icon: ConditionIcon;
  isDay?: boolean;
  className?: string;
  /** Animations are subtle and disabled for prefers-reduced-motion. */
  animated?: boolean;
  label?: string;
}

const SUN = '#f59e0b';
const MOON = '#c7d2fe';
const CLOUD_LIGHT = '#e2e8f0';
const CLOUD_DARK = '#94a3b8';
const RAIN = '#38bdf8';
const SNOW = '#e0f2fe';
const BOLT = '#facc15';

function Sun({ animated, small }: { animated?: boolean; small?: boolean }) {
  const r = small ? 7 : 10;
  const cx = small ? 22 : 32;
  const cy = small ? 22 : 32;
  return (
    <g>
      <g
        className={clsx(animated && 'motion-safe:animate-spin-slow')}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          const r1 = r + 4;
          const r2 = r + (small ? 8 : 10);
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * r1}
              y1={cy + Math.sin(a) * r1}
              x2={cx + Math.cos(a) * r2}
              y2={cy + Math.sin(a) * r2}
              stroke={SUN}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={SUN} />
    </g>
  );
}

function Moon({ small }: { small?: boolean }) {
  return small ? (
    <path d="M26 10a11 11 0 1 0 10 15 9 9 0 0 1-10-15z" fill={MOON} />
  ) : (
    <path d="M36 14a18 18 0 1 0 16 24 14 14 0 0 1-16-24z" fill={MOON} />
  );
}

function Cloud({ dark, animated, y = 0 }: { dark?: boolean; animated?: boolean; y?: number }) {
  return (
    <g className={clsx(animated && 'motion-safe:animate-drift')}>
      <path
        transform={`translate(0 ${y})`}
        d="M18 50h30a10 10 0 0 0 1-20 14 14 0 0 0-27 3 8.5 8.5 0 0 0-4 17z"
        fill={dark ? CLOUD_DARK : CLOUD_LIGHT}
        stroke={dark ? '#64748b' : '#cbd5e1'}
        strokeWidth={1.2}
      />
    </g>
  );
}

function Drops({
  animated,
  color = RAIN,
  count = 3,
}: {
  animated?: boolean;
  color?: string;
  count?: number;
}) {
  const xs = count === 2 ? [26, 38] : [22, 32, 42];
  return (
    <g>
      {xs.map((x, i) => (
        <line
          key={x}
          x1={x}
          y1={52}
          x2={x - 3}
          y2={59}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          className={clsx(animated && 'motion-safe:animate-fall')}
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))}
    </g>
  );
}

function Flakes({ animated }: { animated?: boolean }) {
  return (
    <g fill={SNOW} stroke="#7dd3fc" strokeWidth={0.8}>
      {[22, 32, 42].map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={56}
          r={2.6}
          className={clsx(animated && 'motion-safe:animate-fall')}
          style={{ animationDelay: `${i * 0.4}s`, animationDuration: '2.4s' }}
        />
      ))}
    </g>
  );
}

export function WeatherIcon({ icon, isDay = true, className, animated = false, label }: Props) {
  const celestial = isDay ? <Sun animated={animated} small /> : <Moon small />;
  let content: JSX.Element;

  switch (icon) {
    case 'clear':
      content = isDay ? <Sun animated={animated} /> : <Moon />;
      break;
    case 'partly-cloudy':
      content = (
        <>
          {celestial}
          <Cloud animated={animated} y={4} />
        </>
      );
      break;
    case 'cloudy':
      content = (
        <>
          <g transform="translate(8 -8) scale(0.8)">
            <Cloud dark />
          </g>
          <Cloud animated={animated} />
        </>
      );
      break;
    case 'fog':
      content = (
        <>
          <Cloud y={-6} />
          {[48, 54, 60].map((y, i) => (
            <line
              key={y}
              x1={14 + i * 3}
              y1={y}
              x2={50 - i * 2}
              y2={y}
              stroke={CLOUD_DARK}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}
        </>
      );
      break;
    case 'drizzle':
      content = (
        <>
          <Cloud y={-4} />
          <Drops animated={animated} count={2} />
        </>
      );
      break;
    case 'showers':
      content = (
        <>
          {celestial}
          <Cloud y={-2} />
          <Drops animated={animated} />
        </>
      );
      break;
    case 'rain':
    case 'freezing-rain':
      content = (
        <>
          <Cloud dark y={-4} />
          <Drops animated={animated} color={icon === 'freezing-rain' ? '#a5f3fc' : RAIN} />
        </>
      );
      break;
    case 'snow':
    case 'snow-showers':
      content = (
        <>
          {icon === 'snow-showers' && celestial}
          <Cloud y={-4} />
          <Flakes animated={animated} />
        </>
      );
      break;
    case 'thunderstorm':
      content = (
        <>
          <Cloud dark y={-6} />
          <path
            d="M34 44l-7 11h6l-3 9 10-13h-6l4-7z"
            fill={BOLT}
            className={clsx(animated && 'motion-safe:animate-flash')}
          />
        </>
      );
      break;
  }

  return (
    <svg
      viewBox="0 0 64 64"
      className={clsx('overflow-visible', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {content}
    </svg>
  );
}
