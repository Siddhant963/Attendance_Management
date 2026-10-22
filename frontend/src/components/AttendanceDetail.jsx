import { useState } from 'react';
import { Alert, Badge, Field, Icon, Modal } from './ui.jsx';
import SelfieImage from './SelfieImage.jsx';
import { useVerifyAttendanceMutation } from '../api/endpoints.js';
import { errorMessage } from '../api/baseApi.js';
import {
  ATTENDANCE_STATUS, OVERTIME_STATUS, VERIFICATION_STATUS,
  fmtCoords, fmtDate, fmtDateTime, fmtDuration, fmtTime, mapLink,
} from '../utils/format.js';

function PunchPanel({ title, punch }) {
  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <SelfieImage large path={punch?.selfieUrl} alt={`${title} selfie`} />
      <dl className="kv" style={{ marginTop: 10 }}>
        <dt>Time</dt><dd className="data-mono">{punch ? fmtTime(punch.at) : '—'}</dd>
        <dt>Location</dt>
        <dd>
          {punch ? (
            <a href={mapLink(punch)} target="_blank" rel="noreferrer">
              <Icon name="location_on" className="icon-xs" /> <span className="data-mono">{fmtCoords(punch)}</span>
            </a>
          ) : '—'}
        </dd>
        {punch?.accuracy != null && (<><dt>Accuracy</dt><dd className="data-mono">±{Math.round(punch.accuracy)} m</dd></>)}
      </dl>
    </div>
  );
}

function ReviewForm({ record, onDone }) {
  const [verify, { isLoading }] = useVerifyAttendanceMutation();
  const [remarks, setRemarks] = useState(record.verification.remarks || '');
  const [error, setError] = useState('');

  const submit = async (status) => {
    setError('');
    if (status === 'invalid' && !remarks.trim()) {
      setError('Add a remark explaining why this attendance is invalid.');
      return;
    }
    try {
      await verify({ id: record.id, status, remarks: remarks.trim() || undefined }).unwrap();
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
      <h3 style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="verified_user" className="icon-sm" /> Verify authenticity</h3>
      <Alert>{error}</Alert>
      <Field label="Remarks / notes" id="remarks">
        <textarea id="remarks" rows={3} maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </Field>
      <div className="modal-actions">
        <button className="btn danger" disabled={isLoading} onClick={() => submit('invalid')}><Icon name="close" className="icon-sm" /> Mark invalid</button>
        <button className="btn success" disabled={isLoading} onClick={() => submit('valid')}><Icon name="check" className="icon-sm" /> Mark valid</button>
      </div>
    </div>
  );
}

/** Attendance detail with both selfies, locations and (for reviewers) the verification form. */
export default function AttendanceDetail({ record, canReview, onClose }) {
  const v = record.verification;
  return (
    <Modal title={`${record.user?.name ? `${record.user.name} · ` : ''}${fmtDate(record.date)}`} onClose={onClose}>
      <div className="split">
        <PunchPanel title="Punch in" punch={record.punchIn} />
        <PunchPanel title="Punch out" punch={record.punchOut} />
      </div>
      <dl className="kv" style={{ marginTop: 16 }}>
        <dt>Working hours</dt><dd>{record.punchOut ? fmtDuration(record.workingMinutes) : '—'}</dd>
        <dt>Status</dt><dd><Badge map={ATTENDANCE_STATUS} value={record.status} /></dd>
        <dt>Overtime</dt><dd><Badge map={OVERTIME_STATUS} value={record.overtimeStatus} /></dd>
        <dt>Verification</dt><dd><Badge map={VERIFICATION_STATUS} value={v.status} /></dd>
        {v.reviewedBy && (<><dt>Reviewed by</dt><dd>{v.reviewedBy.name}{v.reviewedAt ? ` · ${fmtDateTime(v.reviewedAt)}` : ''}</dd></>)}
        {v.remarks && (<><dt>Remarks</dt><dd style={{ fontWeight: 400 }}>{v.remarks}</dd></>)}
      </dl>
      {canReview && <ReviewForm record={record} onDone={onClose} />}
    </Modal>
  );
}
