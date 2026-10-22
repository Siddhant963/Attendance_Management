import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import { Badge, Card, Icon, PageHeader, QueryState, Stat } from '../components/ui.jsx';
import AttendanceTable from '../components/AttendanceTable.jsx';
import AttendanceDetail from '../components/AttendanceDetail.jsx';
import {
  useGetCurrentQuery, useGetDailyReportQuery, useGetMyAttendanceQuery, useGetOvertimeQueueQuery, useGetSummaryQuery,
} from '../api/endpoints.js';
import { ATTENDANCE_STATUS, OVERTIME_STATUS, fmtDate, fmtDuration, fmtTime } from '../utils/format.js';

function EmployeeDashboard() {
  const summary = useGetSummaryQuery();
  const current = useGetCurrentQuery();
  const recent = useGetMyAttendanceQuery({ page: 1, limit: 5 });
  const [detail, setDetail] = useState(null);
  const today = current.data?.attendance;

  return (
    <>
      <PageHeader
        eyebrow={<><Icon name="person" className="icon-sm" /> Employee Workspace</>}
        title="My Dashboard"
        subtitle="Your attendance, working hours and overtime this month."
        actions={
          <Link className="btn" to="/punch">
            <Icon name="punch_clock" className="icon-sm" /> {today && !today.punchOut ? 'Punch out' : 'Punch in'}
          </Link>
        }
      />
      <QueryState query={summary}>
        {summary.data && (
          <div className="grid stats">
            <Stat
              icon="schedule"
              label="Today"
              value={today ? ATTENDANCE_STATUS[today.status].label : 'Not punched in'}
              hint={today ? `In ${fmtTime(today.punchIn.at)}${today.punchOut ? ` · Out ${fmtTime(today.punchOut.at)}` : ''}` : 'Punch in to start your day'}
            />
            <Stat icon="event_available" label="Days this month" value={summary.data.month.days} hint={`${summary.data.month.byStatus.completed || 0} completed · ${summary.data.month.byStatus.incomplete || 0} incomplete`} />
            <Stat icon="hourglass_bottom" label="Hours this month" value={fmtDuration(summary.data.month.minutes)} />
            <Stat
              icon="task_alt"
              tone="info"
              label="Overtime requests"
              value={(summary.data.overtime.pending || 0) + (summary.data.overtime.approved || 0) + (summary.data.overtime.rejected || 0)}
              hint={`${summary.data.overtime.pending || 0} pending · ${summary.data.overtime.approved || 0} approved · ${summary.data.overtime.rejected || 0} rejected`}
            />
          </div>
        )}
      </QueryState>
      <Card icon="history" title="Recent attendance" actions={<Link to="/my-attendance">View all</Link>}>
        <QueryState query={recent} isEmpty={recent.data?.items.length === 0} emptyText="No attendance yet.">
          {recent.data && (
            <AttendanceTable
              items={recent.data.items}
              renderActions={(r) => <button className="btn secondary sm" onClick={() => setDetail(r)}>Details</button>}
            />
          )}
        </QueryState>
      </Card>
      {detail && <AttendanceDetail record={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

function TeamDashboard({ isAdmin }) {
  const summary = useGetSummaryQuery();
  const today = useGetDailyReportQuery({});
  const pending = useGetOvertimeQueueQuery({ status: 'pending', page: 1, limit: 5 });
  const [detail, setDetail] = useState(null);
  const s = summary.data;

  return (
    <>
      <PageHeader
        eyebrow={<><Icon name={isAdmin ? 'shield_person' : 'supervisor_account'} className="icon-sm" /> {isAdmin ? 'System Administration' : 'Manager Operations'}</>}
        title={isAdmin ? 'Admin Dashboard' : 'Manager Dashboard'}
        subtitle={isAdmin ? 'System-wide attendance overview and pending actions.' : 'Your assigned team overview and pending actions.'}
      />
      <QueryState query={summary}>
        {s && (
          <div className="grid stats">
            <Stat icon={isAdmin ? 'groups' : 'group'} label={isAdmin ? 'Active users' : 'Team members'} value={s.teamSize} hint={isAdmin ? Object.entries(s.usersByRole || {}).map(([k, v]) => `${v} ${k}`).join(' · ') : undefined} />
            <Stat icon="login" label="Present today" value={s.presentToday} />
            <Stat icon="pending_actions" tone="warning" label="Pending verification" value={s.pendingVerification} hint="Completed days awaiting review" />
            <Stat icon="task_alt" tone="info" label="Pending overtime" value={s.pendingOvertime} />
          </div>
        )}
      </QueryState>
      <div className="grid split">
        <Card icon="group" title="Today's attendance" actions={<Link to="/reports">Full report</Link>}>
          <QueryState query={today} isEmpty={today.data?.rows.length === 0} emptyText="No one has punched in today.">
            {today.data && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Employee</th><th>In</th><th>Out</th><th>Hours</th><th>Status</th></tr></thead>
                  <tbody>
                    {today.data.rows.slice(0, 8).map((r) => (
                      <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(r)}>
                        <td>{r.user?.name}</td>
                        <td>{fmtTime(r.punchIn?.at)}</td>
                        <td>{fmtTime(r.punchOut?.at)}</td>
                        <td>{r.punchOut ? fmtDuration(r.workingMinutes) : '—'}</td>
                        <td><Badge map={ATTENDANCE_STATUS} value={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </QueryState>
        </Card>
        <Card icon="pending_actions" title="Pending overtime" actions={<Link to="/approvals">Review</Link>}>
          <QueryState query={pending} isEmpty={pending.data?.items.length === 0} emptyText="No pending requests.">
            {pending.data && (
              <ul className="item-list">
                {pending.data.items.map((o) => (
                  <li key={o.id}>
                    <div>
                      <strong>{o.user?.name}</strong>
                      <span className="muted small">{fmtDate(o.date)} · {o.requestedHours}h requested</span>
                      <span className="muted small clamp">{o.reason}</span>
                    </div>
                    <Badge map={OVERTIME_STATUS} value={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Card>
      </div>
      {detail && <AttendanceDetail record={detail} canReview onClose={() => setDetail(null)} />}
    </>
  );
}

export default function DashboardPage() {
  const user = useSelector(selectUser);
  if (user.role === 'employee') return <EmployeeDashboard />;
  return <TeamDashboard isAdmin={user.role === 'admin'} />;
}
