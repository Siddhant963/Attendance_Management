import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import { Badge, Card, Field, Icon, PageHeader, QueryState, Stat } from '../components/ui.jsx';
import SelfieImage from '../components/SelfieImage.jsx';
import AttendanceDetail from '../components/AttendanceDetail.jsx';
import { useGetDailyReportQuery, useGetUserOptionsQuery } from '../api/endpoints.js';
import { ATTENDANCE_STATUS, fmtCoords, fmtDate, fmtDuration, fmtTime, mapLink, todayLocal } from '../utils/format.js';

export default function ReportPage() {
  const user = useSelector(selectUser);
  const reviewer = user.role !== 'employee';
  const [date, setDate] = useState(todayLocal());
  const [userId, setUserId] = useState('');
  const [detail, setDetail] = useState(null);
  const users = useGetUserOptionsQuery(undefined, { skip: !reviewer });
  const query = useGetDailyReportQuery({ date, ...(userId && { userId }) });
  const scope = user.role === 'admin' ? 'all employees' : user.role === 'manager' ? 'your team' : 'you';

  return (
    <>
      <PageHeader
        eyebrow={<><Icon name="description" className="icon-sm" /> Reports</>}
        title="Daily Attendance & Working Hours"
        subtitle={`${fmtDate(date)} · showing ${scope}`}
        actions={<button className="btn secondary no-print" onClick={() => window.print()}><Icon name="print" className="icon-sm" /> Print</button>}
      />
      <Card>
        <div className="filters no-print">
          <Field label="Date" id="date"><input id="date" type="date" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
          {reviewer && (
            <Field label="Employee" id="userId">
              <select id="userId" value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Everyone</option>
                {users.data?.items.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
          )}
        </div>
        <QueryState query={query} isEmpty={query.data?.rows.length === 0} emptyText="No attendance was recorded for this date.">
          {query.data && (
            <>
              <div className="grid stats">
                <Stat icon="description" label="Records" value={query.data.summary.total} />
                <Stat icon="check_circle" label="Completed" value={query.data.summary.completed} />
                <Stat icon="pending_actions" tone="warning" label="Incomplete" value={query.data.summary.incomplete} />
                <Stat icon="report" tone="danger" label="Marked invalid" value={query.data.summary.invalid} />
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Punch in</th><th>Punch out</th><th>Selfie</th><th>Location</th><th>Hours</th><th>Status</th><th /></tr>
                  </thead>
                  <tbody>
                    {query.data.rows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.user?.name}</td>
                        <td>{fmtTime(r.punchIn?.at)}</td>
                        <td>{fmtTime(r.punchOut?.at)}</td>
                        <td>
                          <div className="row-actions">
                            <SelfieImage path={r.punchIn?.selfieUrl} alt="Punch-in selfie" onOpen={() => setDetail(r)} />
                            {r.punchOut && <SelfieImage path={r.punchOut.selfieUrl} alt="Punch-out selfie" onOpen={() => setDetail(r)} />}
                          </div>
                        </td>
                        <td className="small">
                          <a href={mapLink(r.punchIn)} target="_blank" rel="noreferrer">
                            <Icon name="location_on" className="icon-xs" /> <span className="data-mono">{fmtCoords(r.punchIn)}</span>
                          </a>
                        </td>
                        <td className="data-mono">{r.punchOut ? fmtDuration(r.workingMinutes) : '—'}</td>
                        <td>
                          <Badge map={ATTENDANCE_STATUS} value={r.status} />
                          {r.verification.status === 'invalid' && <div><span className="badge danger">Invalid</span></div>}
                        </td>
                        <td className="no-print"><button className="btn secondary sm" onClick={() => setDetail(r)}>Details</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </QueryState>
      </Card>
      {detail && <AttendanceDetail record={detail} canReview={reviewer && detail.user?.id !== user.id} onClose={() => setDetail(null)} />}
    </>
  );
}
