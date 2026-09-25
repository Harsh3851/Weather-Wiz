import { BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAlertEvaluation } from '@/hooks/useUserCollections';

export function AlertsBanner() {
  const { data } = useAlertEvaluation();
  const triggered = data?.triggered ?? [];
  if (triggered.length === 0) return null;
  return (
    <section
      aria-label="Weather alerts"
      className="rounded-2xl border border-warn/30 bg-warn/10 p-3 sm:p-4"
    >
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {triggered.length === 1 ? '1 alert' : `${triggered.length} alerts`} triggered by your
            rules
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-muted">
            {triggered.map((a) => (
              <li key={a.ruleId}>{a.message}</li>
            ))}
          </ul>
        </div>
        <Link
          to="/settings#alerts"
          className="shrink-0 text-sm font-medium text-accent hover:underline"
        >
          Manage
        </Link>
      </div>
    </section>
  );
}
