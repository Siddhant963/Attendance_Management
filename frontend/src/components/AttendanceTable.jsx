import { Badge, Icon } from './ui.jsx';
import { ATTENDANCE_STATUS, OVERTIME_STATUS, VERIFICATION_STATUS, fmtCoords, fmtDate, fmtDuration, fmtTime, mapLink } from '../utils/format.js';

/**
 * Presentational attendance table; `renderActions(record)` supplies per-row buttons.
 * `review` is the verification layout: it adds the punch-in location and drops the overtime column to stay compact.
 */
export default function AttendanceTable({ items, showUser, review, renderActions }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            {showUser && <th>Employee</th>}
            <th>In</th>
            <th>Out</th>
            <th>Hours</th>
            {review && <th>Punch-in location</th>}
            <th>Status</th>
            <th>Verification</th>
            {!review && <th>Overtime</th>}
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td className="nowrap">{fmtDate(r.date)}</td>
              {showUser && <td className="nowrap">{r.user?.name}</td>}
              <td className="data-mono nowrap">{fmtTime(r.punchIn?.at)}</td>
              <td className="data-mono nowrap">{fmtTime(r.punchOut?.at)}</td>
              <td className="data-mono nowrap">{r.punchOut ? fmtDuration(r.workingMinutes) : '—'}</td>
              {review && (
                <td className="nowrap">
                  <a href={mapLink(r.punchIn)} target="_blank" rel="noreferrer">
                    <Icon name="location_on" className="icon-xs" /> <span className="data-mono">{fmtCoords(r.punchIn)}</span>
                  </a>
                </td>
              )}
              <td><Badge map={ATTENDANCE_STATUS} value={r.status} /></td>
              <td><Badge map={VERIFICATION_STATUS} value={r.verification.status} /></td>
              {!review && <td><Badge map={OVERTIME_STATUS} value={r.overtimeStatus} /></td>}
              <td><div className="row-actions">{renderActions(r)}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
