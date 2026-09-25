import type { Logger } from 'pino';
import { AppError } from './errors';

export interface FetchJsonOptions {
  timeoutMs: number;
  retries: number;
  retryBaseDelayMs: number;
  logger?: Logger;
  /** Short label used in logs and error messages, e.g. "forecast". */
  label: string;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GETs a JSON document with a per-attempt timeout and exponential backoff with
 * jitter. 4xx responses (other than 408/425/429) fail fast because retrying a
 * bad request cannot succeed.
 */
export async function fetchJson<T>(url: string, opts: FetchJsonOptions): Promise<T> {
  let lastError: AppError | undefined;

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    if (attempt > 0) {
      const backoff = opts.retryBaseDelayMs * 2 ** (attempt - 1);
      await sleep(backoff + Math.random() * opts.retryBaseDelayMs);
    }
    const started = Date.now();
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': 'weather-wiz/1.0' },
        signal: AbortSignal.timeout(opts.timeoutMs),
      });
      opts.logger?.debug(
        { upstream: opts.label, status: res.status, ms: Date.now() - started, attempt },
        'upstream response',
      );
      if (res.ok) return (await res.json()) as T;

      const body = await res.text().catch(() => '');
      if (!RETRYABLE_STATUS.has(res.status)) {
        let reason = `${opts.label} request was rejected by Open-Meteo`;
        try {
          const parsed = JSON.parse(body) as { reason?: string };
          if (parsed.reason) reason = parsed.reason;
        } catch {
          /* non-JSON body */
        }
        throw new AppError(400, 'UPSTREAM_BAD_REQUEST', reason);
      }
      lastError = new AppError(
        502,
        'UPSTREAM_ERROR',
        `Weather provider is unavailable (${opts.label}: HTTP ${res.status})`,
      );
    } catch (err) {
      if (err instanceof AppError && err.code === 'UPSTREAM_BAD_REQUEST') throw err;
      if (err instanceof AppError) {
        lastError = err;
      } else if (
        err instanceof Error &&
        (err.name === 'TimeoutError' || err.name === 'AbortError')
      ) {
        lastError = new AppError(
          504,
          'UPSTREAM_TIMEOUT',
          `Weather provider timed out (${opts.label} after ${opts.timeoutMs} ms)`,
        );
      } else {
        lastError = new AppError(
          502,
          'UPSTREAM_ERROR',
          `Weather provider is unreachable (${opts.label})`,
        );
      }
    }
    opts.logger?.warn(
      { upstream: opts.label, attempt, code: lastError?.code },
      'upstream attempt failed',
    );
  }

  throw lastError ?? new AppError(502, 'UPSTREAM_ERROR', 'Weather provider failed');
}
