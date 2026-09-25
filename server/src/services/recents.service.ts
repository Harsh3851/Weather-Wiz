import {
  MAX_RECENT_SEARCHES,
  roundCoord,
  type LocationInput,
  type RecentSearch as RecentSearchDto,
} from '@weatherwiz/shared';
import { RecentSearch, toRecentSearchDto } from '../models/RecentSearch';

export async function listRecent(userId: string): Promise<RecentSearchDto[]> {
  const docs = await RecentSearch.find({ userId })
    .sort({ searchedAt: -1 })
    .limit(MAX_RECENT_SEARCHES);
  return docs.map(toRecentSearchDto);
}

export async function addRecent(userId: string, input: LocationInput): Promise<RecentSearchDto[]> {
  const latitude = roundCoord(input.latitude);
  const longitude = roundCoord(input.longitude);
  await RecentSearch.findOneAndUpdate(
    { userId, latitude, longitude },
    {
      $set: {
        name: input.name,
        country: input.country ?? null,
        countryCode: input.countryCode ?? null,
        admin1: input.admin1 ?? null,
        searchedAt: new Date(),
      },
    },
    { upsert: true },
  );
  // Trim anything beyond the most recent N.
  const overflow = await RecentSearch.find({ userId })
    .sort({ searchedAt: -1 })
    .skip(MAX_RECENT_SEARCHES)
    .select('_id');
  if (overflow.length) await RecentSearch.deleteMany({ _id: { $in: overflow.map((d) => d._id) } });
  return listRecent(userId);
}

export async function clearRecent(userId: string): Promise<void> {
  await RecentSearch.deleteMany({ userId });
}
