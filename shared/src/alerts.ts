import type { AlertMetric, AlertRule, DailyPoint, Forecast, TriggeredAlert } from './types';

export const ALERT_METRICS: Record<
  AlertMetric,
  { label: string; unit: 'percent' | 'mm' | 'temperature' | 'wind' | 'index' }
> = {
  precipitationProbability: { label: 'Chance of rain', unit: 'percent' },
  precipitationSum: { label: 'Rainfall', unit: 'mm' },
  temperatureMax: { label: 'Max temperature', unit: 'temperature' },
  temperatureMin: { label: 'Min temperature', unit: 'temperature' },
  windSpeedMax: { label: 'Max wind speed', unit: 'wind' },
  uvIndexMax: { label: 'UV index', unit: 'index' },
};

function metricValue(day: DailyPoint, metric: AlertMetric): number | null {
  switch (metric) {
    case 'precipitationProbability':
      return day.precipitationProbabilityMax;
    case 'precipitationSum':
      return day.precipitationSum;
    case 'temperatureMax':
      return day.temperatureMax;
    case 'temperatureMin':
      return day.temperatureMin;
    case 'windSpeedMax':
      return day.windSpeedMax;
    case 'uvIndexMax':
      return day.uvIndexMax;
  }
}

function formatValue(metric: AlertMetric, value: number): string {
  const unit = ALERT_METRICS[metric].unit;
  const rounded = Math.round(value * 10) / 10;
  switch (unit) {
    case 'percent':
      return `${rounded}%`;
    case 'mm':
      return `${rounded} mm`;
    case 'temperature':
      return `${rounded}°C`;
    case 'wind':
      return `${rounded} km/h`;
    default:
      return String(rounded);
  }
}

/** Human description of a rule, e.g. "Chance of rain above 70% tomorrow in Noida". */
export function describeAlertRule(
  rule: Pick<AlertRule, 'metric' | 'operator' | 'threshold' | 'day' | 'locationName'>,
): string {
  const op = rule.operator === 'gt' ? 'above' : 'below';
  return `${ALERT_METRICS[rule.metric].label} ${op} ${formatValue(rule.metric, rule.threshold)} ${rule.day} in ${rule.locationName}`;
}

/**
 * Evaluates a rule against a forecast. Returns a triggered alert when the
 * condition holds, otherwise null. Values are compared in metric units.
 */
export function evaluateAlertRule(rule: AlertRule, forecast: Forecast): TriggeredAlert | null {
  if (!rule.enabled) return null;
  const day = forecast.daily[rule.day === 'today' ? 0 : 1];
  if (!day) return null;
  const actual = metricValue(day, rule.metric);
  if (actual === null) return null;
  const hit = rule.operator === 'gt' ? actual > rule.threshold : actual < rule.threshold;
  if (!hit) return null;
  const label = ALERT_METRICS[rule.metric].label;
  return {
    ruleId: rule.id,
    locationName: rule.locationName,
    metric: rule.metric,
    operator: rule.operator,
    threshold: rule.threshold,
    day: rule.day,
    date: day.date,
    actual,
    message: `${label} ${rule.day} in ${rule.locationName} is ${formatValue(rule.metric, actual)} (rule: ${rule.operator === 'gt' ? 'above' : 'below'} ${formatValue(rule.metric, rule.threshold)}).`,
  };
}
