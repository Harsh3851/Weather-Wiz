import type { Preferences, PreferencesPatch } from '@weatherwiz/shared';
import { notFound } from '../lib/errors';
import { User, toPublicUser } from '../models/User';

export async function getPreferences(userId: string): Promise<Preferences> {
  const user = await User.findById(userId);
  if (!user) throw notFound('User not found');
  return toPublicUser(user).preferences;
}

export async function updatePreferences(
  userId: string,
  patch: PreferencesPatch,
): Promise<Preferences> {
  const set = Object.fromEntries(
    Object.entries(patch).map(([k, v]) => [`preferences.${k}`, v] as const),
  );
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: set },
    { new: true, runValidators: true },
  );
  if (!user) throw notFound('User not found');
  return toPublicUser(user).preferences;
}
