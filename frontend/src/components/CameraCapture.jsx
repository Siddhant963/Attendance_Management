import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './ui.jsx';

const MAX_WIDTH = 640;

/**
 * Live camera capture only: frames come from getUserMedia, never from a file picker.
 * Calls onCapture(dataUrl | null) whenever the captured photo changes.
 */
export default function CameraCapture({ onCapture, disabled }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | starting | live | error
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setError('This browser does not support camera access (HTTPS is required outside localhost).');
      return;
    }
    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
      streamRef.current = stream;
      setStatus('live');
    } catch (err) {
      setStatus('error');
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser and try again.'
          : err.name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : 'Could not start the camera.'
      );
    }
  };

  // Attach the stream once the <video> element exists.
  useEffect(() => {
    if (status === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [status]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setPhoto(dataUrl);
    onCapture(dataUrl);
    stop();
    setStatus('idle');
  };

  const retake = () => {
    setPhoto(null);
    onCapture(null);
    start();
  };

  return (
    <div>
      <div className="camera">
        {photo ? (
          <img src={photo} alt="Captured selfie preview" />
        ) : status === 'live' ? (
          <video ref={videoRef} playsInline muted />
        ) : (
          <div className="placeholder">
            <Icon name="videocam" className="icon-sm" style={{ display: 'block', margin: '0 auto 6px' }} />
            {status === 'starting' ? 'Starting camera…' : 'Turn on the camera to take a live selfie'}
          </div>
        )}
      </div>
      {error && <div className="alert error" style={{ marginTop: 10 }}>{error}</div>}
      <div className="row-actions" style={{ marginTop: 12 }}>
        {photo ? (
          <button type="button" className="btn secondary" onClick={retake} disabled={disabled}><Icon name="replay" className="icon-sm" /> Retake</button>
        ) : status === 'live' ? (
          <button type="button" className="btn" onClick={capture} disabled={disabled}><Icon name="radio_button_checked" className="icon-sm" /> Capture selfie</button>
        ) : (
          <button type="button" className="btn secondary" onClick={start} disabled={disabled || status === 'starting'}>
            <Icon name="videocam" className="icon-sm" /> {status === 'error' ? 'Try again' : 'Turn on camera'}
          </button>
        )}
      </div>
    </div>
  );
}
