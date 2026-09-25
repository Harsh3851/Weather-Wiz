import mongoose from 'mongoose';
import {
  MAX_SAVED_LOCATIONS,
  roundCoord,
  type SavedLocation as SavedLocationDto,
  type SavedLocationInput,
  type SavedLocationPatch,
} from '@weatherwiz/shared';
import { badRequest, conflict, limitReached, notFound } from '../lib/errors';
import { SavedLocation, toSavedLocationDto } from '../models/SavedLocation';

function assertObjectId(id: string) {
  if (!mongoose.isValidObjectId(id)) throw notFound('Saved location not found');
}

export async function listLocations(userId: string): Promise<SavedLocationDto[]> {
  const docs = await SavedLocation.find({ userId }).sort({ order: 1, createdAt: 1 });
  return docs.map(toSavedLocationDto);
}

export async function addLocation(
  userId: string,
  input: SavedLocationInput,
): Promise<SavedLocationDto> {
  const count = await SavedLocation.countDocuments({ userId });
  if (count >= MAX_SAVED_LOCATIONS) {
    throw limitReached(`You can save up to ${MAX_SAVED_LOCATIONS} locations`);
  }
  const latitude = roundCoord(input.latitude);
  const longitude = roundCoord(input.longitude);
  const makeDefault = input.isDefault ?? count === 0;
  if (makeDefault) await SavedLocation.updateMany({ userId }, { $set: { isDefault: false } });
  try {
    const doc = await SavedLocation.create({
      userId,
      name: input.name,
      country: input.country ?? null,
      countryCode: input.countryCode ?? null,
      admin1: input.admin1 ?? null,
      latitude,
      longitude,
      timezone: input.timezone ?? null,
      isDefault: makeDefault,
      order: count,
    });
    return toSavedLocationDto(doc);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw conflict(`${input.name} is already in your saved locations`);
    }
    throw err;
  }
}

export async function updateLocation(
  userId: string,
  id: string,
  patch: SavedLocationPatch,
): Promise<SavedLocationDto> {
  assertObjectId(id);
  const doc = await SavedLocation.findOne({ _id: id, userId });
  if (!doc) throw notFound('Saved location not found');
  if (patch.isDefault === true) {
    await SavedLocation.updateMany(
      { userId, _id: { $ne: doc._id } },
      { $set: { isDefault: false } },
    );
  }
  if (patch.name !== undefined) doc.name = patch.name;
  if (patch.isDefault !== undefined) doc.isDefault = patch.isDefault;
  await doc.save();
  return toSavedLocationDto(doc);
}

export async function removeLocation(userId: string, id: string): Promise<void> {
  assertObjectId(id);
  const doc = await SavedLocation.findOneAndDelete({ _id: id, userId });
  if (!doc) throw notFound('Saved location not found');
  // Keep order contiguous and promote a new default if needed.
  const rest = await SavedLocation.find({ userId }).sort({ order: 1 });
  await SavedLocation.bulkWrite(
    rest.map((loc, index) => ({
      updateOne: {
        filter: { _id: loc._id },
        update: {
          $set: { order: index, ...(doc.isDefault && index === 0 ? { isDefault: true } : {}) },
        },
      },
    })),
  );
}

export async function reorderLocations(userId: string, ids: string[]): Promise<SavedLocationDto[]> {
  const existing = await SavedLocation.find({ userId }).select('_id');
  const existingIds = new Set(existing.map((d) => String(d._id)));
  const unique = new Set(ids);
  if (
    unique.size !== ids.length ||
    ids.length !== existingIds.size ||
    !ids.every((id) => existingIds.has(id))
  ) {
    throw badRequest('ids must list every saved location exactly once');
  }
  await SavedLocation.bulkWrite(
    ids.map((id, order) => ({
      updateOne: { filter: { _id: id, userId }, update: { $set: { order } } },
    })),
  );
  return listLocations(userId);
}
