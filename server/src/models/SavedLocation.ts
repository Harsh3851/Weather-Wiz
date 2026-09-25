import { Schema, model } from 'mongoose';
import type { SavedLocation as SavedLocationDto } from '@weatherwiz/shared';

const savedLocationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    country: { type: String, default: null },
    countryCode: { type: String, default: null },
    admin1: { type: String, default: null },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    timezone: { type: String, default: null },
    isDefault: { type: Boolean, default: false },
    order: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false },
);

savedLocationSchema.index({ userId: 1, order: 1 });
savedLocationSchema.index({ userId: 1, latitude: 1, longitude: 1 }, { unique: true });

export const SavedLocation = model('SavedLocation', savedLocationSchema);

interface SavedLocationLike {
  id?: unknown;
  name: string;
  country?: string | null;
  countryCode?: string | null;
  admin1?: string | null;
  latitude: number;
  longitude: number;
  timezone?: string | null;
  isDefault: boolean;
  order: number;
  createdAt: Date;
}

export function toSavedLocationDto(doc: SavedLocationLike): SavedLocationDto {
  return {
    id: doc.id as string,
    name: doc.name,
    country: doc.country ?? null,
    countryCode: doc.countryCode ?? null,
    admin1: doc.admin1 ?? null,
    latitude: doc.latitude,
    longitude: doc.longitude,
    timezone: doc.timezone ?? null,
    isDefault: doc.isDefault,
    order: doc.order,
    createdAt: doc.createdAt.toISOString(),
  };
}
