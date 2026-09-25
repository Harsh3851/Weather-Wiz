import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Upstream response cache. `freshUntil` decides HIT vs MISS; `expiresAt` is
 * later (fresh + stale window) and drives the TTL index that lets MongoDB
 * delete the document. Between the two, an entry may be served as STALE when
 * Open-Meteo is failing.
 */
const cacheEntrySchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    kind: { type: String, required: true, enum: ['geocode', 'forecast', 'air-quality'] },
    value: { type: Schema.Types.Mixed, required: true },
    fetchedAt: { type: Date, required: true },
    freshUntil: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    hits: { type: Number, default: 0 },
  },
  { versionKey: false, minimize: false },
);

cacheEntrySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type CacheEntryDoc = InferSchemaType<typeof cacheEntrySchema>;
export const CacheEntry = model('CacheEntry', cacheEntrySchema);
