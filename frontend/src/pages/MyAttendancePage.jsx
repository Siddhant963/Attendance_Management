import { useState } from 'react';
import { useFilters } from '../hooks/useFilters.js';
import { Card, Field, Icon, MapOptions, Modal, PageHeader, Pagination, QueryState, Stat } from '../components/ui.jsx';
import AttendanceTable from '../components/AttendanceTable.jsx';
import AttendanceDetail from '../components/AttendanceDetail.jsx';
import OvertimeRequestForm from '../components/OvertimeRequestForm.jsx';
import { useGetMyAttendanceQuery, useGetSummaryQuery } from '../api/endpoints.js';
import { ATTENDANCE_STATUS, fmtDuration } from '../utils/format.js';

function OvertimeModal({ record, onClose }) {
  return (
    <Modal title={<><Icon name="hourglass_top" className="icon-sm" /> Request overtime</>} narrow onClose={onClose}>
      <OvertimeRequestForm records={[record]} onDone={onClose} onCancel={onClose} />
    </Modal>
  );
}

export default function MyAttendancePage() {
  const { params, bind, setPage } = useFilters({ from: '', to: '', status: '' });
  const [detail, setDetail] = useState(null);
  const [otFor, setOtFor] = useState(null);

  const query = useGetMyAttendanceQuery(params);
  const month = useGetSummaryQuery().data?.month;

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
          <Field label="From" id="from"><input id="from" type="date" {...bind('from')} /></Field>
          <Field label="To" id="to"><input id="to" type="date" {...bind('to')} /></Field>
          <Field label="Status" id="status">
            <select id="status" {...bind('status')}>
              <option value="">All</option>
              <MapOptions map={ATTENDANCE_STATUS} />
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
