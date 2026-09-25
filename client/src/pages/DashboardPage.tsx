import { roundCoord } from '@weatherwiz/shared';
import { clsx } from 'clsx';
import { Crosshair, Database, Star } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { AlertsBanner } from '@/components/weather/AlertsBanner';
import { AqiCard } from '@/components/weather/AqiCard';
import { CurrentHero, CurrentHeroSkeleton } from '@/components/weather/CurrentHero';
import { DailyForecast } from '@/components/weather/DailyForecast';
import { Highlights, HighlightsSkeleton } from '@/components/weather/Highlights';
import { HourlyChart } from '@/components/weather/HourlyChart';
import { SunCard } from '@/components/weather/SunCard';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePreferences } from '@/hooks/usePreferences';
import { useSelectPlace } from '@/hooks/useSelectPlace';
import { useSavedLocations } from '@/hooks/useUserCollections';
import { useAirQuality, useForecast } from '@/hooks/useWeather';
import { errorMessage } from '@/lib/api/errors';
import { IS_DEMO } from '@/lib/config';
import { formatCoords, formatTime } from '@/lib/format';
import { DEFAULT_PLACE, placeFromParams, samePlace, type Place } from '@/lib/place';

export function DashboardPage() {
  const [params] = useSearchParams();
  const { preferences: prefs } = usePreferences();
  const saved = useSavedLocations();
  const selectPlace = useSelectPlace();
  const geo = useGeolocation();

  const fromUrl = placeFromParams(params);
  const defaultSaved = saved.locations.find((l) => l.isDefault) ?? saved.locations[0];
  const place: Place = fromUrl ?? defaultSaved ?? DEFAULT_PLACE;

  const forecast = useForecast(place.latitude, place.longitude);
  const air = useAirQuality(place.latitude, place.longitude);
  const savedMatch = saved.locations.find((l) => samePlace(l, place));

  useEffect(() => {
    document.title = `${place.name} weather · Weather Wiz`;
  }, [place.name]);

  const toggleSaved = () => {
    if (savedMatch) saved.remove.mutate(savedMatch);
    else
      saved.add.mutate({
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        country: place.country ?? null,
        countryCode: place.countryCode ?? null,
        admin1: place.admin1 ?? null,
        timezone: place.timezone ?? forecast.data?.data.timezone ?? null,
      });
  };

  const locateMe = () => {
    geo
      .locate()
      .then(({ latitude, longitude }) =>
        selectPlace(
          {
            name: 'My location',
            latitude: roundCoord(latitude, 3),
            longitude: roundCoord(longitude, 3),
            admin1: formatCoords(latitude, longitude),
          },
          { record: false },
        ),
      )
      .catch((err: Error) => toast.error(err.message));
  };

  const data = forecast.data?.data;
  const meta = forecast.data?.meta;
  const showingStale = forecast.isPlaceholderData;

  return (
    <div className="space-y-4 sm:space-y-5">
      {saved.locations.length > 0 && (
        <nav aria-label="Saved places" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {saved.locations.map((l) => {
            const active = samePlace(l, place);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => selectPlace(l, { record: false })}
                aria-current={active ? 'true' : undefined}
                className={clsx(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'border-accent bg-accent/10 font-medium text-fg'
                    : 'border-border bg-surface text-muted hover:text-fg',
                )}
              >
                {l.isDefault && (
                  <Star className="h-3.5 w-3.5 fill-current text-amber-500" aria-label="Default" />
                )}
                {l.name}
              </button>
            );
          })}
        </nav>
      )}

      <AlertsBanner />

      {forecast.isError && !data ? (
        <div className="card">
          <ErrorState
            title="Could not load the forecast"
            message={errorMessage(forecast.error, 'The weather service is unavailable right now.')}
            onRetry={() => void forecast.refetch()}
          />
        </div>
      ) : (
        <>
          <div
            className={clsx(
              'grid gap-4 lg:grid-cols-5 lg:gap-5',
              showingStale && 'opacity-70 transition-opacity',
            )}
            aria-busy={forecast.isFetching}
          >
            <div className="lg:col-span-3">
              {data ? (
                <CurrentHero
                  place={place}
                  forecast={data}
                  prefs={prefs}
                  actions={
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="bg-white/15 text-white hover:bg-white/25"
                        onClick={locateMe}
                        loading={geo.status === 'locating'}
                        aria-label="Use my location"
                        title="Use my location"
                      >
                        {geo.status !== 'locating' && <Crosshair className="h-[18px] w-[18px]" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="bg-white/15 text-white hover:bg-white/25"
                        onClick={toggleSaved}
                        loading={saved.add.isPending || saved.remove.isPending}
                        aria-pressed={Boolean(savedMatch)}
                        aria-label={
                          savedMatch
                            ? `Remove ${place.name} from saved places`
                            : `Save ${place.name}`
                        }
                        title={savedMatch ? 'Remove from saved places' : 'Save place'}
                      >
                        <Star
                          className={clsx(
                            'h-[18px] w-[18px]',
                            savedMatch && 'fill-amber-300 text-amber-300',
                          )}
                        />
                      </Button>
                    </>
                  }
                />
              ) : (
                <CurrentHeroSkeleton />
              )}
            </div>
            <div className="lg:col-span-2">
              {data ? <Highlights forecast={data} prefs={prefs} /> : <HighlightsSkeleton />}
            </div>
          </div>

          {data ? (
            <HourlyChart hourly={data.hourly} prefs={prefs} />
          ) : (
            <div className="card h-[420px] p-5" aria-hidden>
              <div className="skeleton h-4 w-40" />
              <div className="skeleton mt-6 h-[320px] w-full" />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
            <div className="lg:col-span-2">
              {data ? (
                <DailyForecast daily={data.daily} prefs={prefs} />
              ) : (
                <div className="card space-y-3 p-5" aria-hidden>
                  {Array.from({ length: 7 }, (_, i) => (
                    <div key={i} className="skeleton h-10 w-full" />
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-5">
              <AqiCard
                data={air.data?.data}
                isLoading={air.isPending}
                error={air.error}
                onRetry={() => void air.refetch()}
              />
              {data?.daily[0] ? (
                <SunCard today={data.daily[0]} now={data.current.time} prefs={prefs} />
              ) : (
                <div className="card h-56 p-5" aria-hidden>
                  <div className="skeleton h-full w-full" />
                </div>
              )}
            </div>
          </div>

          {meta && data && (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Database className="h-3.5 w-3.5" aria-hidden />
              Conditions at {formatTime(data.current.time, prefs.timeFormat)} local time ·{' '}
              {IS_DEMO
                ? 'fetched directly from Open-Meteo'
                : meta.cache === 'HIT'
                  ? 'served from the API cache'
                  : meta.cache === 'STALE'
                    ? 'provider unavailable, showing the last cached forecast'
                    : 'fresh from Open-Meteo via the API'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
