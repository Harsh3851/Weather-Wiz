import type { TimeFormat } from '@weatherwiz/shared';

/**
 * Open-Meteo returns wall-clock times in the location's own timezone
 * ("2026-09-25T14:00"). We format those strings directly instead of going
 * through Date, so the viewer's browser timezone never shifts them.
 */

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function parseLocal(value: string): Parts {
  const [date = '', time = '00:00'] = value.split('T');
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number);
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  return { year, month, day, hour, minute };
}

const pad = (n: number) => String(n).padStart(2, '0');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** DD-MM-YYYY */
export function formatDate(value: string): string {
  const { year, month, day } = parseLocal(value);
  return `${pad(day)}-${pad(month)}-${year}`;
}

/** DD-MM */
export function formatShortDate(value: string): string {
  const { month, day } = parseLocal(value);
  return `${pad(day)}-${pad(month)}`;
}

export function weekday(value: string, style: 'long' | 'short' = 'long'): string {
  const { year, month, day } = parseLocal(value);
  const name = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? '';
  return style === 'short' ? name.slice(0, 3) : name;
}

export function formatTime(value: string, format: TimeFormat): string {
  const { hour, minute } = parseLocal(value);
  if (format === '24h') return `${pad(hour)}:${pad(minute)}`;
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${pad(minute)} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** Compact hour label for chart axes: "14:00" or "2 PM". */
export function formatHour(value: string, format: TimeFormat): string {
  const { hour } = parseLocal(value);
  if (format === '24h') return `${pad(hour)}:00`;
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function minutesOfDay(value: string): number {
  const { hour, minute } = parseLocal(value);
  return hour * 60 + minute;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h} h ${pad(m)} min`;
}

/** Relative day label used on forecast cards. */
export function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  const a = parseLocal(date);
  const b = parseLocal(today);
  const diff =
    (Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86_400_000;
  if (diff === 1) return 'Tomorrow';
  return weekday(date, 'short');
}

export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

export function placeSubtitle(loc: { admin1?: string | null; country?: string | null }): string {
  return [loc.admin1, loc.country].filter(Boolean).join(', ');
}

/** Formats an ISO timestamp (UTC) as DD-MM-YYYY in the viewer's timezone. */
export function formatTimestampDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}
