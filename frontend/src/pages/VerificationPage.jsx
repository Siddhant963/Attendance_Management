import { useState } from 'react';
import { useFilters } from '../hooks/useFilters.js';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import { Card, Field, Icon, MapOptions, PageHeader, Pagination, QueryState } from '../components/ui.jsx';
import AttendanceTable from '../components/AttendanceTable.jsx';
import AttendanceDetail from '../components/AttendanceDetail.jsx';
import { useGetTeamAttendanceQuery, useGetUserOptionsQuery } from '../api/endpoints.js';
import { ATTENDANCE_STATUS, VERIFICATION_STATUS } from '../utils/format.js';

export default function VerificationPage() {
  const me = useSelector(selectUser);
  const isAdmin = me.role === 'admin';
  const { params, bind, setPage } = useFilters({ verification: 'pending', userId: '', from: '', to: '', status: '' });
  const [detail, setDetail] = useState(null);
  const users = useGetUserOptionsQuery();
  const query = useGetTeamAttendanceQuery(params);

  return (
    <>
      <PageHeader
        eyebrow={<><Icon name={isAdmin ? 'monitoring' : 'verified_user'} className="icon-sm" /> {isAdmin ? 'System Administration' : 'Manager Operations'}</>}
        title={isAdmin ? 'System Attendance Monitor' : 'Team Attendance & Verification'}
        subtitle={isAdmin
          ? 'Authorized system-wide attendance records and details for every employee.'
          : 'Review selfies and locations for your team, then mark attendance valid or invalid.'}
      />
      <Card>
        <div className="filters">
          <Field label="Verification" id="verification">
            <select id="verification" {...bind('verification')}>
              <option value="">All</option>
              <MapOptions map={VERIFICATION_STATUS} />
            </select>
          </Field>
          <Field label="Employee" id="userId">
            <select id="userId" {...bind('userId')}>
              <option value="">Everyone</option>
              {users.data?.items.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Status" id="status">
            <select id="status" {...bind('status')}>
              <option value="">All</option>
              <MapOptions map={ATTENDANCE_STATUS} />
            </select>
          </Field>
          <Field label="From" id="from"><input id="from" type="date" {...bind('from')} /></Field>
          <Field label="To" id="to"><input id="to" type="date" {...bind('to')} /></Field>
        </div>
        <QueryState query={query} isEmpty={query.data?.items.length === 0} emptyText="No attendance records match these filters.">
          {query.data && (
            <>
              <AttendanceTable
                showUser
                review
                items={query.data.items}
                renderActions={(r) => <button className="btn secondary sm" onClick={() => setDetail(r)}>Review</button>}
              />
              <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onChange={setPage} />
            </>
          )}
        </QueryState>
      </Card>
      {detail && <AttendanceDetail record={detail} canReview={detail.user?.id !== me.id} onClose={() => setDetail(null)} />}
    </>
  );
}
