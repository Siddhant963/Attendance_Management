import { useState } from 'react';
import { Card, Field, Icon, Modal, PageHeader, Pagination, QueryState, Stat } from '../components/ui.jsx';
import AttendanceTable from '../components/AttendanceTable.jsx';
import AttendanceDetail from '../components/AttendanceDetail.jsx';
import OvertimeRequestForm from '../components/OvertimeRequestForm.jsx';
import { useGetMyAttendanceQuery, useGetSummaryQuery } from '../api/endpoints.js';
import { fmtDuration } from '../utils/format.js';

function OvertimeModal({ record, onClose }) {
  return (
    <Modal title={<><Icon name="hourglass_top" className="icon-sm" /> Request overtime</>} narrow onClose={onClose}>
      <OvertimeRequestForm records={[record]} onDone={onClose} onCancel={onClose} />
    </Modal>
  );
}

export default function MyAttendancePage() {
  const [filters, setFilters] = useState({ from: '', to: '', status: '' });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [otFor, setOtFor] = useState(null);

  const params = { page, limit: 10, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
  const query = useGetMyAttendanceQuery(params);
  const month = useGetSummaryQuery().data?.month;
  const setFilter = (k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e.target.value }));
    setPage(1);
  };

  return (
    <>
      <PageHeader
        eyebrow={<><Icon name="schedule" className="icon-sm" /> Personal History</>}
        title="My Attendance"
        subtitle="Your punch history, working hours and overtime."
      />
      {month && (
        <div className="grid stats">
          <Stat icon="calendar_month" label="Days this month" value={month.days} />
          <Stat icon="hourglass_top" label="Hours this month" value={fmtDuration(month.minutes)} />
          <Stat icon="task_alt" label="Completed (8h+)" value={month.byStatus.completed || 0} />
          <Stat icon="pending_actions" tone="warning" label="Incomplete (under 8h)" value={month.byStatus.incomplete || 0} />
        </div>
      )}
      <Card>
        <div className="filters">
          <Field label="From" id="from"><input id="from" type="date" value={filters.from} onChange={setFilter('from')} /></Field>
          <Field label="To" id="to"><input id="to" type="date" value={filters.to} onChange={setFilter('to')} /></Field>
          <Field label="Status" id="status">
            <select id="status" value={filters.status} onChange={setFilter('status')}>
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Incomplete</option>
              <option value="in_progress">In progress</option>
            </select>
          </Field>
        </div>
        <QueryState query={query} isEmpty={query.data?.items.length === 0} emptyText="No attendance records match these filters.">
          {query.data && (
            <>
              <AttendanceTable
                items={query.data.items}
                renderActions={(r) => (
                  <>
                    <button className="btn secondary sm" onClick={() => setDetail(r)}>Details</button>
                    {r.punchOut && r.overtimeStatus === 'none' && (
                      <button className="btn secondary sm" onClick={() => setOtFor(r)}>Request OT</button>
                    )}
                  </>
                )}
              />
              <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onChange={setPage} />
            </>
          )}
        </QueryState>
      </Card>
      {detail && <AttendanceDetail record={detail} onClose={() => setDetail(null)} />}
      {otFor && <OvertimeModal record={otFor} onClose={() => setOtFor(null)} />}
    </>
  );
}
