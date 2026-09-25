import { zodResolver } from '@hookform/resolvers/zod';
import {
  ALERT_METRICS,
  DEFAULT_LOCATION,
  describeAlertRule,
  type AlertMetric,
  type AlertRule,
  type Preferences,
} from '@weatherwiz/shared';
import { clsx } from 'clsx';
import { BellPlus, BellRing, Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/ui/States';
import { usePreferences } from '@/hooks/usePreferences';
import { useAlertEvaluation, useAlertRules, useSavedLocations } from '@/hooks/useUserCollections';
import { convertTemp, convertWind, tempUnitLabel, windUnitLabel } from '@/lib/units';

const alertFormSchema = z.object({
  locationKey: z.string().min(1, 'Choose a location'),
  metric: z.enum(Object.keys(ALERT_METRICS) as [AlertMetric, ...AlertMetric[]]),
  operator: z.enum(['gt', 'lt']),
  threshold: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .min(-100, 'Too low')
    .max(1000, 'Too high'),
  day: z.enum(['today', 'tomorrow']),
});
type AlertForm = z.infer<typeof alertFormSchema>;

function unitFor(metric: AlertMetric, prefs: Preferences): string {
  switch (ALERT_METRICS[metric].unit) {
    case 'percent':
      return '%';
    case 'mm':
      return 'mm';
    case 'temperature':
      return tempUnitLabel(prefs.temperatureUnit);
    case 'wind':
      return windUnitLabel(prefs.windUnit);
    default:
      return '';
  }
}

/** Convert a threshold typed in display units back to the metric units rules are stored in. */
function toMetric(metric: AlertMetric, value: number, prefs: Preferences): number {
  const unit = ALERT_METRICS[metric].unit;
  if (unit === 'temperature' && prefs.temperatureUnit === 'fahrenheit')
    return Math.round((((value - 32) * 5) / 9) * 10) / 10;
  if (unit === 'wind' && prefs.windUnit === 'ms') return Math.round(value * 3.6 * 10) / 10;
  return value;
}

function describeForDisplay(rule: AlertRule, prefs: Preferences): string {
  const unit = ALERT_METRICS[rule.metric].unit;
  if (unit === 'temperature' || unit === 'wind') {
    const v =
      unit === 'temperature'
        ? convertTemp(rule.threshold, prefs.temperatureUnit)
        : convertWind(rule.threshold, prefs.windUnit);
    const label = ALERT_METRICS[rule.metric].label;
    return `${label} ${rule.operator === 'gt' ? 'above' : 'below'} ${Math.round(v * 10) / 10}${unitFor(rule.metric, prefs)} ${rule.day} in ${rule.locationName}`;
  }
  return describeAlertRule(rule);
}

function PreferencesCard() {
  const { preferences, update } = usePreferences();
  return (
    <Card title="Preferences" subtitle="Applied instantly across the app.">
      <div className="grid gap-5 sm:grid-cols-2">
        <Segmented
          label="Temperature"
          value={preferences.temperatureUnit}
          onChange={(v) => update({ temperatureUnit: v })}
          options={[
            { value: 'celsius', label: '°C' },
            { value: 'fahrenheit', label: '°F' },
          ]}
        />
        <Segmented
          label="Wind speed"
          value={preferences.windUnit}
          onChange={(v) => update({ windUnit: v })}
          options={[
            { value: 'kmh', label: 'km/h' },
            { value: 'ms', label: 'm/s' },
          ]}
        />
        <Segmented
          label="Time format"
          value={preferences.timeFormat}
          onChange={(v) => update({ timeFormat: v })}
          options={[
            { value: '24h', label: '24-hour' },
            { value: '12h', label: '12-hour' },
          ]}
        />
        <Segmented
          label="Theme"
          value={preferences.theme}
          onChange={(v) => update({ theme: v })}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </div>
    </Card>
  );
}

function AlertsCard() {
  const { preferences: prefs } = usePreferences();
  const { locations } = useSavedLocations();
  const { rules, create, toggle, remove } = useAlertRules();
  const evaluation = useAlertEvaluation();
  const triggeredIds = new Set(evaluation.data?.triggered.map((t) => t.ruleId));

  const choices = useMemo(() => {
    const list = locations.map((l) => ({
      key: l.id,
      name: l.name,
      latitude: l.latitude,
      longitude: l.longitude,
    }));
    if (!list.some((l) => l.name === DEFAULT_LOCATION.name)) {
      list.push({
        key: 'default',
        name: DEFAULT_LOCATION.name,
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
      });
    }
    return list;
  }, [locations]);

  const form = useForm<AlertForm>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      locationKey: choices[0]?.key ?? 'default',
      metric: 'precipitationProbability',
      operator: 'gt',
      threshold: 70,
      day: 'tomorrow',
    },
  });
  const metric = form.watch('metric');
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) => {
    const loc = choices.find((c) => c.key === values.locationKey);
    if (!loc) return;
    create.mutate(
      {
        locationName: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        metric: values.metric,
        operator: values.operator,
        threshold: toMetric(values.metric, values.threshold, prefs),
        day: values.day,
      },
      { onSuccess: () => form.reset({ ...values }) },
    );
  });

  return (
    <Card
      title="Weather alerts"
      subtitle="Rules are checked each time you open the app and shown as in-app alerts."
      id="alerts"
    >
      <form
        onSubmit={(e) => void onSubmit(e)}
        noValidate
        className="grid gap-3 rounded-2xl bg-surface-2/60 p-3 sm:grid-cols-6 sm:p-4"
      >
        <div className="sm:col-span-2">
          <label htmlFor="alert-location" className="label">
            Location
          </label>
          <select id="alert-location" className="input" {...form.register('locationKey')}>
            {choices.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="alert-metric" className="label">
            When
          </label>
          <select id="alert-metric" className="input" {...form.register('metric')}>
            {(Object.keys(ALERT_METRICS) as AlertMetric[]).map((m) => (
              <option key={m} value={m}>
                {ALERT_METRICS[m].label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="alert-day" className="label">
            Day
          </label>
          <select id="alert-day" className="input" {...form.register('day')}>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="alert-operator" className="label">
            Is
          </label>
          <select id="alert-operator" className="input" {...form.register('operator')}>
            <option value="gt">Above</option>
            <option value="lt">Below</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="alert-threshold" className="label">
            Threshold ({unitFor(metric, prefs) || 'index'})
          </label>
          <input
            id="alert-threshold"
            type="number"
            step="any"
            inputMode="decimal"
            className={clsx('input', errors.threshold && 'border-danger')}
            aria-invalid={Boolean(errors.threshold)}
            aria-describedby={errors.threshold ? 'alert-threshold-error' : undefined}
            {...form.register('threshold')}
          />
          {errors.threshold && (
            <p id="alert-threshold-error" className="mt-1 text-xs text-danger">
              {errors.threshold.message}
            </p>
          )}
        </div>
        <div className="flex items-end sm:col-span-2">
          <Button type="submit" variant="primary" className="w-full" loading={create.isPending}>
            <BellPlus className="h-4 w-4" aria-hidden /> Add rule
          </Button>
        </div>
      </form>

      {rules.length === 0 ? (
        <EmptyState icon={<BellRing className="h-5 w-5" />} title="No alert rules">
          For example: chance of rain above 70% tomorrow in Noida.
        </EmptyState>
      ) : (
        <ul className="mt-4 divide-y divide-border/60" aria-label="Alert rules">
          {rules.map((r) => {
            const hit = triggeredIds.has(r.id);
            return (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={r.enabled}
                    onChange={() => toggle.mutate(r)}
                    aria-label={`${r.enabled ? 'Disable' : 'Enable'} rule: ${describeForDisplay(r, prefs)}`}
                  />
                  <span className="h-5 w-9 rounded-full bg-border transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2" />
                  <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </label>
                <p
                  className={clsx(
                    'min-w-0 flex-1 text-sm',
                    !r.enabled && 'text-muted line-through',
                  )}
                >
                  {describeForDisplay(r, prefs)}
                </p>
                {hit && r.enabled && (
                  <span className="rounded-md bg-warn/15 px-2 py-0.5 text-xs font-semibold text-warn">
                    Triggered
                  </span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-danger hover:bg-danger/10"
                  aria-label="Delete rule"
                  onClick={() => remove.mutate(r)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function SettingsPage() {
  useEffect(() => {
    document.title = 'Settings · Weather Wiz';
    if (window.location.hash.includes('alerts'))
      document.getElementById('alerts')?.scrollIntoView();
  }, []);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">Units, display and weather alert rules.</p>
      </div>
      <PreferencesCard />
      <AlertsCard />
    </div>
  );
}
