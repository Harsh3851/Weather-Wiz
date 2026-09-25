import { Schema, model } from 'mongoose';
import { DEFAULT_PREFERENCES, type PublicUser } from '@weatherwiz/shared';

const preferencesSchema = new Schema(
  {
    temperatureUnit: {
      type: String,
      enum: ['celsius', 'fahrenheit'],
      default: DEFAULT_PREFERENCES.temperatureUnit,
    },
    windUnit: { type: String, enum: ['kmh', 'ms'], default: DEFAULT_PREFERENCES.windUnit },
    timeFormat: { type: String, enum: ['12h', '24h'], default: DEFAULT_PREFERENCES.timeFormat },
    theme: {
      type: String,
      enum: ['system', 'light', 'dark'],
      default: DEFAULT_PREFERENCES.theme,
    },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    isDemo: { type: Boolean, default: false },
    preferences: { type: preferencesSchema, default: () => ({}) },
  },
  { timestamps: true, versionKey: false },
);

export const User = model('User', userSchema);
export type UserDoc = InstanceType<typeof User>;

interface UserLike {
  id?: unknown;
  name: string;
  email: string;
  isDemo?: boolean | null;
  preferences?: Partial<PublicUser['preferences']> | null;
  createdAt: Date;
}

export function toPublicUser(user: UserLike): PublicUser {
  const p = user.preferences ?? DEFAULT_PREFERENCES;
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    isDemo: Boolean(user.isDemo),
    preferences: {
      temperatureUnit: p.temperatureUnit ?? DEFAULT_PREFERENCES.temperatureUnit,
      windUnit: p.windUnit ?? DEFAULT_PREFERENCES.windUnit,
      timeFormat: p.timeFormat ?? DEFAULT_PREFERENCES.timeFormat,
      theme: p.theme ?? DEFAULT_PREFERENCES.theme,
    },
    createdAt: user.createdAt.toISOString(),
  };
}
