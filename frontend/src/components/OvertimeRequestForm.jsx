import { useState } from 'react';
import { Alert, Field } from './ui.jsx';
import { useRequestOvertimeMutation } from '../api/endpoints.js';
import { errorMessage } from '../api/baseApi.js';
import { fmtDate, fmtDuration } from '../utils/format.js';

/** Overtime request for one of the user's punched-out days. `records` are the eligible attendance records. */
export default function OvertimeRequestForm({ records, onDone, onCancel }) {
  const [attendanceId, setAttendanceId] = useState(records[0]?.id);
  const [form, setForm] = useState({ requestedHours: '1', reason: '' });
  const [error, setError] = useState('');
  const [request, { isLoading }] = useRequestOvertimeMutation();
  const selected = records.find((r) => r.id === attendanceId) ?? records[0];
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await request({ attendanceId: selected.id, requestedHours: Number(form.requestedHours), reason: form.reason.trim() }).unwrap();
      setForm({ requestedHours: '1', reason: '' });
      onDone?.();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={submit}>
      <Alert>{error}</Alert>
      {records.length > 1 ? (
        <Field label="Day" id="ot-day">
          <select id="ot-day" value={selected.id} onChange={(e) => setAttendanceId(e.target.value)}>
            {records.map((r) => (
              <option key={r.id} value={r.id}>{fmtDate(r.date)} · worked {fmtDuration(r.workingMinutes)}</option>
            ))}
          </select>
        </Field>
      ) : (
        <p className="muted" style={{ marginTop: 0 }}>{fmtDate(selected.date)} · worked {fmtDuration(selected.workingMinutes)}</p>
      )}
      <Field label="Overtime hours" id="ot-hours">
        <input id="ot-hours" type="number" min="0.5" max="12" step="0.5" required value={form.requestedHours} onChange={set('requestedHours')} />
      </Field>
      <Field label="Reason" id="ot-reason">
        <textarea id="ot-reason" rows={3} maxLength={500} required value={form.reason} onChange={set('reason')} />
      </Field>
      <div className="modal-actions">
        {onCancel && <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>}
        <button className="btn" disabled={isLoading || form.reason.trim().length < 3}>{isLoading ? 'Sending…' : 'Submit request'}</button>
      </div>
    </form>
  );
}
