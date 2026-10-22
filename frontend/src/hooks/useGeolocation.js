import { useCallback, useState } from 'react';

const messages = {
  1: 'Location permission was denied. Allow location access in your browser to punch.',
  2: 'Your location could not be determined. Check your device settings and try again.',
  3: 'Timed out while getting your location. Try again.',
};

/** Browser geolocation, requested on demand. */
export function useGeolocation() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const request = useCallback(
    () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          setError('Geolocation is not supported by this browser.');
          return resolve(null);
        }
        setLoading(true);
        setError('');
        navigator.geolocation.getCurrentPosition(
          ({ coords: c }) => {
            setLoading(false);
            resolve({ latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy });
          },
          (err) => {
            setError(messages[err.code] || 'Could not get your location.');
            setLoading(false);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }),
    []
  );

  return { error, loading, request };
}
