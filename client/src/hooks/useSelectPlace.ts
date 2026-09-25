import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { placeToParams, type Place } from '@/lib/place';
import { useRecentSearches } from './useUserCollections';

/** Opens a place on the dashboard and records it as a recent search. */
export function useSelectPlace() {
  const navigate = useNavigate();
  const { add } = useRecentSearches();
  return useCallback(
    (place: Place, opts: { record?: boolean } = {}) => {
      navigate({ pathname: '/', search: `?${placeToParams(place).toString()}` });
      if (opts.record !== false) {
        add.mutate({
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          country: place.country ?? null,
          countryCode: place.countryCode ?? null,
          admin1: place.admin1 ?? null,
          timezone: place.timezone ?? null,
        });
      }
    },
    [navigate, add],
  );
}
