import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Card, CenterLoader, Icon, PageHeader } from '../components/ui.jsx';
import CameraCapture from '../components/CameraCapture.jsx';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { useGetCurrentQuery, usePunchInMutation, usePunchOutMutation } from '../api/endpoints.js';
import { errorMessage } from '../api/baseApi.js';
import { ATTENDANCE_STATUS, fmtCoords, fmtDate, fmtDuration, fmtTime } from '../utils/format.js';

export default function PunchPage() {
  const { data, isLoading, isError, refetch } = useGetCurrentQuery();
  const [punchIn, inState] = usePunchInMutation();
  const [punchOut, outState] = usePunchOutMutation();
  const geo = useGeolocation();
  const [selfie, setSelfie] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  if (isLoading) return <CenterLoader />;
  if (isError) return <Alert>Could not load your attendance. <button className="btn ghost sm" onClick={refetch}>Retry</button></Alert>;

  const current = data?.attendance;
  const isOpen = current && !current.punchOut;
  const finishedToday = current && current.punchOut;
  const busy = inState.isLoading || outState.isLoading || geo.loading;

  const submit = async () => {
    setError('');
    setDone('');
    if (!selfie) return setError('Take a live selfie first.');
    const position = await geo.request();
    if (!position) return setError('Location is required to punch. Allow location access and try again.');
    const body = { selfie, ...position };
    try {
      if (isOpen) await punchOut(body).unwrap();
      else await punchIn(body).unwrap();
      setSelfie(null);
      setDone(isOpen ? 'Punched out. Your working hours have been recorded.' : 'Punched in. Have a productive day!');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={<><Icon name="punch_clock" className="icon-sm" /> Attendance Punch</>}
        title="Punch In / Out"
        subtitle="A live selfie and your current location are captured with every punch."
      />
      <div className="punch-layout">
        <Card icon="photo_camera" title={isOpen ? 'Punch out' : finishedToday ? 'Today is complete' : 'Punch in'}>
          <Alert>{error}</Alert>
          <Alert tone="success">{done}</Alert>
          {finishedToday && !done ? (
            <p className="muted">You have already punched in and out today. See <Link to="/my-attendance">My Attendance</Link> for details or to request overtime.</p>
          ) : finishedToday ? null : (
            <>
              {/* key resets the camera component after each successful punch */}
              <CameraCapture key={current?.id || 'new'} onCapture={setSelfie} disabled={busy} />
              {geo.error && <Alert>{geo.error}</Alert>}
              <button className="btn block" style={{ marginTop: 16, maxWidth: 480 }} onClick={submit} disabled={busy || !selfie}>
                <Icon name="punch_clock" className="icon-sm" /> {busy ? 'Submitting…' : isOpen ? 'Punch out' : 'Punch in'}
              </button>
              {!selfie && <p className="small muted">Capture a selfie to enable punching.</p>}
            </>
          )}
        </Card>

        <Card icon="today" title="Today">
          {current ? (
            <dl className="kv">
              <dt>Date</dt><dd>{fmtDate(current.date)}</dd>
              <dt>Status</dt><dd><Badge map={ATTENDANCE_STATUS} value={current.status} /></dd>
              <dt>Punch in</dt><dd className="data-mono">{fmtTime(current.punchIn.at)}</dd>
              <dt>Punch out</dt><dd className="data-mono">{fmtTime(current.punchOut?.at)}</dd>
              <dt>Hours</dt><dd className="data-mono">{current.punchOut ? fmtDuration(current.workingMinutes) : 'Running…'}</dd>
              <dt>Location</dt><dd className="small data-mono">{fmtCoords(current.punchOut || current.punchIn)}</dd>
            </dl>
          ) : (
            <p className="muted">You have not punched in today.</p>
          )}
          <p className="small muted" style={{ marginBottom: 0 }}>
            Standard shift is 8 hours. Working hours are calculated by the server from your punch times.
          </p>
        </Card>
      </div>
    </>
  );
}
