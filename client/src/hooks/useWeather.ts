import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { roundCoord } from '@weatherwiz/shared';
import { weatherService } from '@/lib/services';

const FIVE_MIN = 5 * 60_000;

export function useForecast(lat: number | undefined, lon: number | undefined) {
  const enabled = lat !== undefined && lon !== undefined;
  return useQuery({
    queryKey: ['forecast', enabled ? roundCoord(lat) : null, enabled ? roundCoord(lon) : null],
    queryFn: ({ signal }) => weatherService.forecast(lat!, lon!, signal),
    enabled,
    staleTime: FIVE_MIN,
    refetchInterval: 10 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAirQuality(lat: number | undefined, lon: number | undefined) {
  const enabled = lat !== undefined && lon !== undefined;
  return useQuery({
    queryKey: ['air-quality', enabled ? roundCoord(lat) : null, enabled ? roundCoord(lon) : null],
    queryFn: ({ signal }) => weatherService.airQuality(lat!, lon!, signal),
    enabled,
    staleTime: 15 * 60_000,
    // AQI is a secondary panel: fail fast and let the card show its own error.
    retry: 1,
  });
}

export function useGeocode(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['geocode', q.toLowerCase()],
    queryFn: ({ signal }) => weatherService.geocode(q, signal),
    enabled: q.length >= 2,
    staleTime: 60 * 60_000,
    retry: 1,
    placeholderData: keepPreviousData,
  });
}
