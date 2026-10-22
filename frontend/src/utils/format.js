export const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtDate = (ymd) => {
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export const fmtDuration = (minutes) => {
  if (minutes == null) return '—';
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
};

export const fmtCoords = (p) => (p ? `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}` : '—');

export const mapLink = (p) => `https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`;

export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const ATTENDANCE_STATUS = {
  in_progress: { label: 'In progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  incomplete: { label: 'Incomplete', tone: 'warning' },
};
export const VERIFICATION_STATUS = {
  pending: { label: 'Pending review', tone: 'neutral' },
  valid: { label: 'Valid', tone: 'success' },
  invalid: { label: 'Invalid', tone: 'danger' },
};
export const OVERTIME_STATUS = {
  none: { label: 'None', tone: 'neutral' },
  pending: { label: 'Pending', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export const ROLES = {
  employee: { label: 'Employee' },
  manager: { label: 'Manager' },
  admin: { label: 'Admin' },
};

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?';
