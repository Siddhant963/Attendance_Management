import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import { Card, Field, Icon, PageHeader, Pagination, QueryState } from '../components/ui.jsx';
import AttendanceTable from '../components/AttendanceTable.jsx';
import AttendanceDetail from '../components/AttendanceDetail.jsx';
import { useGetTeamAttendanceQuery, useGetUserOptionsQuery } from '../api/endpoints.js';

export default function VerificationPage() {
  const me = useSelector(selectUser);
  const isAdmin = me.role === 'admin';
  const [filters, setFilters] = useState({ verification: 'pending', userId: '', from: '', to: '', status: '' });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const users = useGetUserOptionsQuery();
  const params = { page, limit: 10, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
  const query = useGetTeamAttendanceQuery(params);
  const setFilter = (k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e.target.value }));
    setPage(1);
  };

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
            <select id="verification" value={filters.verification} onChange={setFilter('verification')}>
              <option value="">All</option>
              <option value="pending">Pending review</option>
              <option value="valid">Valid</option>
              <option value="invalid">Invalid</option>
            </select>
          </Field>
          <Field label="Employee" id="userId">
            <select id="userId" value={filters.userId} onChange={setFilter('userId')}>
              <option value="">Everyone</option>
              {users.data?.items.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Status" id="status">
            <select id="status" value={filters.status} onChange={setFilter('status')}>
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Incomplete</option>
              <option value="in_progress">In progress</option>
            </select>
          </Field>
          <Field label="From" id="from"><input id="from" type="date" value={filters.from} onChange={setFilter('from')} /></Field>
          <Field label="To" id="to"><input id="to" type="date" value={filters.to} onChange={setFilter('to')} /></Field>
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
      {detail && <AttendanceDetail record={detail} canReview onClose={() => setDetail(null)} />}
    </>
  );
}
