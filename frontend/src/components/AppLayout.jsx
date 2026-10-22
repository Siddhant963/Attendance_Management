import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import { endSession } from '../api/baseApi.js';
import { Icon } from './ui.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { initials } from '../utils/format.js';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    roles: ['employee', 'manager', 'admin'],
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['employee', 'manager', 'admin'] },
      { to: '/punch', label: 'Punch In / Out', icon: 'punch_clock', roles: ['employee', 'manager', 'admin'] },
      { to: '/my-attendance', label: 'My Attendance', icon: 'schedule', roles: ['employee', 'manager', 'admin'] },
      { to: '/my-overtime', label: 'Overtime Requests', icon: 'hourglass_top', roles: ['employee', 'manager', 'admin'] },
      { to: '/reports', label: 'Daily Reports', icon: 'description', roles: ['employee', 'manager', 'admin'] },
    ],
  },
  {
    label: 'Manager operations',
    roles: ['manager', 'admin'],
    items: [
      { to: '/verification', label: 'Team Verification', adminLabel: 'Attendance Monitor', icon: 'verified_user', roles: ['manager', 'admin'] },
      { to: '/approvals', label: 'Overtime Approvals', icon: 'task_alt', roles: ['manager', 'admin'] },
    ],
  },
  {
    label: 'System administration',
    roles: ['admin'],
    items: [
      { to: '/users', label: 'User Management', icon: 'manage_accounts', roles: ['admin'] },
    ],
  },
];

export default function AppLayout() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  const signOut = () => dispatch(endSession());

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">Attend<span>Flow</span></div>
        <button onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation" aria-expanded={open}>
          <Icon name="menu" className="icon-sm" /> Menu
        </button>
      </div>
      <div className={`sidebar-backdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div>
          <div className="sidebar-head">
            <div className="mark">A</div>
            <div>
              <div className="brand">Attend<span>Flow</span></div>
              <div className="brand-sub">Workforce OS</div>
            </div>
          </div>
          {NAV_GROUPS.filter((g) => g.roles.includes(user.role)).map((group) => (
            <div key={group.label}>
              <p className="nav-section-label">{group.label}</p>
              <nav className="nav-group">
                {group.items.filter((n) => n.roles.includes(user.role)).map((n) => (
                  <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <span className="nav-link-main">
                      <Icon name={n.icon} className="icon-sm" />
                      {user.role === 'admin' && n.adminLabel ? n.adminLabel : n.label}
                    </span>
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>
        <div className="sidebar-foot">
          <ThemeToggle showLabel className="block" />
          <div className="sidebar-foot-row">
            <div className="sidebar-foot-user">
              <div className="avatar">{initials(user.name)}</div>
              <div>
                <strong>{user.name}</strong>
                <span>{user.role}</span>
              </div>
            </div>
            <button className="btn ghost sm" onClick={signOut} aria-label="Sign out" title="Sign out">
              <Icon name="logout" className="icon-sm" />
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
