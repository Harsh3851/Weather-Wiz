import { useCallback, useState } from 'react';

export type GeoStatus = 'idle' | 'locating' | 'error';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

function describe(err: GeolocationPositionError | Error): string {
  if ('code' in err) {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return 'Location access was denied. You can allow it in your browser settings, or search for a city instead.';
      case err.POSITION_UNAVAILABLE:
        return 'Your location is unavailable right now. Try searching for a city.';
      case err.TIMEOUT:
        return 'Finding your location took too long. Please try again.';
    }
  }
  return err.message || 'Could not determine your location.';
}

/** Wraps the browser Geolocation API with friendly errors and a status flag. */
export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback((): Promise<Coordinates> => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      const message = 'Your browser does not support location access.';
      setStatus('error');
      setError(message);
      return Promise.reject(new Error(message));
    }
    setStatus('locating');
    setError(null);
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStatus('idle');
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        (err) => {
          const message = describe(err);
          setStatus('error');
          setError(message);
          reject(new Error(message));
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
      );
    });
  }, []);

  return { status, error, locate };
}
