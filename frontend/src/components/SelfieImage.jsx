import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { API_URL } from '../api/baseApi.js';
import { selectToken } from '../features/auth/authSlice.js';

// Selfies are private: they are fetched with the bearer token and shown through a blob URL.
function useAuthedImage(path) {
  const token = useSelector(selectToken);
  const [state, setState] = useState({ src: null, error: false });

  useEffect(() => {
    if (!path) return undefined;
    let objectUrl;
    let cancelled = false;
    // `path` is "/api/attendance/:id/selfie/:kind"; API_URL already ends with /api (or a full URL).
    const url = `${API_URL.replace(/\/api\/?$/, '')}${path}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('failed'))))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ src: objectUrl, error: false });
      })
      .catch(() => !cancelled && setState({ src: null, error: true }));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, token]);

  return state;
}

export default function SelfieImage({ path, large = false, alt = 'Selfie', onOpen }) {
  const { src, error } = useAuthedImage(path);
  if (!path) return large ? <div className="selfie-missing">No selfie</div> : <span className="muted">—</span>;
  if (error) return large ? <div className="selfie-missing">Selfie unavailable</div> : <span className="muted small">n/a</span>;
  if (!src) return large ? <div className="selfie-missing">Loading…</div> : <span className="thumb" />;
  return large ? (
    <img className="selfie-lg" src={src} alt={alt} />
  ) : (
    <img className="thumb" src={src} alt={alt} onClick={() => onOpen?.(path)} />
  );
}
