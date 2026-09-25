import type { Logger } from 'pino';
import type { CacheStatus } from '@weatherwiz/shared';
import { CacheEntry } from '../models/CacheEntry';
import { AppError } from '../lib/errors';

export type CacheKind = 'geocode' | 'forecast' | 'air-quality';

export interface CacheResult<T> {
  value: T;
  status: CacheStatus;
  fetchedAt: Date;
}

export interface CacheService {
  getOrFetch<T>(
    key: string,
    kind: CacheKind,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<CacheResult<T>>;
}

/**
 * Read-through cache backed by MongoDB with TTL indexes.
 *
 * - Fresh entry: served as HIT without calling upstream.
 * - Expired or missing: fetched upstream (concurrent requests for the same key
 *   share a single in-flight promise) and stored as MISS.
 * - Upstream failure with an entry still inside its stale window: served as
 *   STALE so users keep seeing data during a provider outage.
 */
export function createCacheService(opts: { staleSeconds: number; logger: Logger }): CacheService {
  const inFlight = new Map<string, Promise<CacheResult<unknown>>>();

  async function load<T>(
    key: string,
    kind: CacheKind,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<CacheResult<T>> {
    const now = new Date();
    const existing = await CacheEntry.findOne({ key, expiresAt: { $gt: now } }).lean();

    if (existing && existing.freshUntil > now) {
      void CacheEntry.updateOne({ key }, { $inc: { hits: 1 } }).catch(() => undefined);
      return { value: existing.value as T, status: 'HIT', fetchedAt: existing.fetchedAt };
    }

    try {
      const value = await fetcher();
      const fetchedAt = new Date();
      const freshUntil = new Date(fetchedAt.getTime() + ttlSeconds * 1000);
      const expiresAt = new Date(freshUntil.getTime() + opts.staleSeconds * 1000);
      await CacheEntry.updateOne(
        { key },
        { $set: { kind, value, fetchedAt, freshUntil, expiresAt }, $setOnInsert: { hits: 0 } },
        { upsert: true },
      );
      return { value, status: 'MISS', fetchedAt };
    } catch (err) {
      const recoverable =
        err instanceof AppError &&
        (err.code === 'UPSTREAM_ERROR' || err.code === 'UPSTREAM_TIMEOUT');
      if (existing && recoverable) {
        opts.logger.warn({ key, code: err.code }, 'serving stale cache entry');
        return { value: existing.value as T, status: 'STALE', fetchedAt: existing.fetchedAt };
      }
      throw err;
    }
  }

  return {
    getOrFetch<T>(key: string, kind: CacheKind, ttlSeconds: number, fetcher: () => Promise<T>) {
      const pending = inFlight.get(key);
      if (pending) return pending as Promise<CacheResult<T>>;
      const promise = load(key, kind, ttlSeconds, fetcher).finally(() => inFlight.delete(key));
      inFlight.set(key, promise as Promise<CacheResult<unknown>>);
      return promise;
    },
  };
}
