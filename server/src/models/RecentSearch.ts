import { Schema, model } from 'mongoose';
import type { RecentSearch as RecentSearchDto } from '@weatherwiz/shared';

const recentSearchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    country: { type: String, default: null },
    countryCode: { type: String, default: null },
    admin1: { type: String, default: null },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    searchedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

recentSearchSchema.index({ userId: 1, searchedAt: -1 });
recentSearchSchema.index({ userId: 1, latitude: 1, longitude: 1 }, { unique: true });

export const RecentSearch = model('RecentSearch', recentSearchSchema);

interface RecentSearchLike {
  id?: unknown;
  name: string;
  country?: string | null;
  countryCode?: string | null;
  admin1?: string | null;
  latitude: number;
  longitude: number;
  searchedAt: Date;
}

export function toRecentSearchDto(doc: RecentSearchLike): RecentSearchDto {
  return {
    id: doc.id as string,
    name: doc.name,
    country: doc.country ?? null,
    countryCode: doc.countryCode ?? null,
    admin1: doc.admin1 ?? null,
    latitude: doc.latitude,
    longitude: doc.longitude,
    searchedAt: doc.searchedAt.toISOString(),
  };
}
