import { useState } from 'react';
import { useFilters } from '../hooks/useFilters.js';
import { Alert, Badge, Card, Field, Icon, Modal, PageHeader, Pagination, QueryState } from '../components/ui.jsx';
import OvertimeRequestForm from '../components/OvertimeRequestForm.jsx';
import { useDecideOvertimeMutation, useGetMyAttendanceQuery, useGetMyOvertimeQuery, useGetOvertimeQueueQuery } from '../api/endpoints.js';
import { errorMessage } from '../api/baseApi.js';
import { OVERTIME_STATUS, fmtDate, fmtDateTime } from '../utils/format.js';

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
];

function StatusTabs({ value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {TABS.map((t) => (
        <button key={t.label} role="tab" aria-selected={value === t.value} className={`tab ${value === t.value ? 'active' : ''}`} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Employee screen: track own overtime requests. */
export function MyOvertimePage() {
  const { filters, params, set, setPage } = useFilters({ status: '' });
  const query = useGetMyOvertimeQuery(params);
  const eligible = useGetMyAttendanceQuery({ overtime: 'none', limit: 100 }).data?.items.filter((r) => r.punchOut) ?? [];

  return (
    <>
      <PageHeader
        eyebrow={<><Icon name="hourglass_top" className="icon-sm" /> Overtime Requests</>}
        title="My Overtime"
        subtitle="Request overtime for a completed day and track its approval."
      />
      <div className="grid form-split">
        <Card icon="edit_note" title="New overtime request">
          {eligible.length > 0 ? (
            <OvertimeRequestForm records={eligible} />
          ) : (
            <p className="muted" style={{ margin: 0 }}>No completed days are waiting for an overtime request. Punch out first, then request overtime for that day.</p>
          )}
        </Card>
        <Card icon="history" title="Request history">
        <StatusTabs value={filters.status} onChange={(v) => set('status', v)} />
        <QueryState query={query} isEmpty={query.data?.items.length === 0} emptyText="No overtime requests yet.">
          {query.data && (
            <>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Hours</th><th>Reason</th><th>Status</th><th>Reviewer</th><th>Remarks</th></tr></thead>
                  <tbody>
                    {query.data.items.map((o) => (
                      <tr key={o.id}>
                        <td className="nowrap">{fmtDate(o.date)}</td>
                        <td>{o.requestedHours}</td>
                        <td className="cell-text">{o.reason}</td>
                        <td><Badge map={OVERTIME_STATUS} value={o.status} /></td>
                        <td className="nowrap">{o.reviewedBy?.name || '—'}</td>
                        <td>{o.reviewRemarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onChange={setPage} />
            </>
          )}
        </QueryState>
        </Card>
      </div>
    </>
  );
}

function DecisionModal({ request, decision, onClose }) {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [decide, { isLoading }] = useDecideOvertimeMutation();
  const rejecting = decision === 'rejected';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await decide({ id: request.id, decision, remarks: remarks.trim() || undefined }).unwrap();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Modal title={<><Icon name={rejecting ? 'cancel' : 'task_alt'} className="icon-sm" /> {rejecting ? 'Reject overtime' : 'Approve overtime'}</>} narrow onClose={onClose}>
      <dl className="kv" style={{ marginBottom: 12 }}>
        <dt>Employee</dt><dd>{request.user?.name}</dd>
        <dt>Date</dt><dd>{fmtDate(request.date)}</dd>
        <dt>Requested overtime</dt><dd className="data-mono">{request.requestedHours}h</dd>
      </dl>
      <div className="callout">
        <div className="small muted">Employee justification</div>
        {request.reason}
      </div>
      <form onSubmit={submit}>
        <Alert>{error}</Alert>
        <Field label={rejecting ? 'Reason for rejection (required)' : 'Remarks (optional)'} id="decision-remarks">
          <textarea id="decision-remarks" rows={3} maxLength={500} required={rejecting} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button className={`btn ${rejecting ? 'danger' : 'success'}`} disabled={isLoading || (rejecting && !remarks.trim())}>
            {rejecting ? 'Reject' : 'Approve'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Manager/admin screen: review team overtime requests. */
export function ApprovalsPage() {
  const { filters, params, set, setPage } = useFilters({ status: 'pending' });
  const [active, setActive] = useState(null); // { request, decision }
  const query = useGetOvertimeQueueQuery(params);

  return (
    <>
      <PageHeader
        eyebrow={<><Icon name="task_alt" className="icon-sm" /> Manager Operations</>}
        title="Overtime Approvals"
        subtitle="Request details and authorized approve/reject actions for your team."
      />
      <Card>
        <StatusTabs value={filters.status} onChange={(v) => set('status', v)} />
        <QueryState query={query} isEmpty={query.data?.items.length === 0} emptyText="No overtime requests in this view.">
          {query.data && (
            <>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Employee</th><th>Date</th><th>Hours</th><th>Reason</th><th>Status</th><th>Submitted</th><th /></tr></thead>
                  <tbody>
                    {query.data.items.map((o) => (
                      <tr key={o.id}>
                        <td className="nowrap">{o.user?.name}</td>
                        <td className="nowrap">{fmtDate(o.date)}</td>
                        <td>{o.requestedHours}</td>
                        <td className="cell-text">{o.reason}</td>
                        <td>
                          <Badge map={OVERTIME_STATUS} value={o.status} />
                          {o.reviewRemarks && <div className="small muted">{o.reviewRemarks}</div>}
                        </td>
                        <td className="nowrap">{fmtDateTime(o.createdAt)}</td>
                        <td>
                          {o.status === 'pending' && (
                            <div className="row-actions inline">
                              <button className="btn success sm" onClick={() => setActive({ request: o, decision: 'approved' })}><Icon name="check" className="icon-xs" /> Approve</button>
                              <button className="btn danger sm" onClick={() => setActive({ request: o, decision: 'rejected' })}><Icon name="close" className="icon-xs" /> Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onChange={setPage} />
            </>
          )}
        </QueryState>
      </Card>
      {active && <DecisionModal {...active} onClose={() => setActive(null)} />}
    </>
  );
}
