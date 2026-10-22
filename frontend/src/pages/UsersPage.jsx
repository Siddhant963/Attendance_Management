import { useState } from 'react';
import { useFilters } from '../hooks/useFilters.js';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import { Alert, Card, Field, Icon, MapOptions, PageHeader, Pagination, QueryState } from '../components/ui.jsx';
import { useGetManagersQuery, useGetUsersQuery, useUpdateUserMutation } from '../api/endpoints.js';
import { errorMessage } from '../api/baseApi.js';
import { ROLES, fmtDate, initials } from '../utils/format.js';

export default function UsersPage() {
  const me = useSelector(selectUser);
  const { params, bind, setPage } = useFilters({ search: '', role: '' });
  const [error, setError] = useState('');
  const query = useGetUsersQuery(params);
  const managers = useGetManagersQuery();
  const [update, { isLoading }] = useUpdateUserMutation();

  const change = async (id, patch) => {
    setError('');
    try {
      await update({ id, ...patch }).unwrap();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={<><Icon name="manage_accounts" className="icon-sm" /> System Administration</>}
        title="User Management"
        subtitle="User directory, roles, account status and manager assignments. New sign-ups are always employees."
      />
      <Card>
        <Alert>{error}</Alert>
        <div className="filters">
          <Field label="Search" id="search"><input id="search" placeholder="Name or email" {...bind('search')} /></Field>
          <Field label="Role" id="role">
            <select id="role" {...bind('role')}>
              <option value="">All roles</option>
              <MapOptions map={ROLES} />
            </select>
          </Field>
        </div>
        <QueryState query={query} isEmpty={query.data?.items.length === 0} emptyText="No users found.">
          {query.data && (
            <>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Manager</th><th>Joined</th><th>Active</th></tr></thead>
                  <tbody>
                    {query.data.items.map((u) => {
                      const self = u.id === me.id;
                      return (
                        <tr key={u.id}>
                          <td>
                            <div className="person">
                              <div className="avatar">{initials(u.name)}</div>
                              <span>{u.name}{self && <span className="muted small"> (you)</span>}</span>
                            </div>
                          </td>
                          <td className="data-mono">{u.email}</td>
                          <td>
                            <select aria-label={`Role for ${u.name}`} value={u.role} disabled={isLoading || self} onChange={(e) => change(u.id, { role: e.target.value })}>
                              <MapOptions map={ROLES} />
                            </select>
                          </td>
                          <td>
                            <select aria-label={`Manager for ${u.name}`} value={u.manager?.id || ''} disabled={isLoading}
                              onChange={(e) => change(u.id, { manager: e.target.value || null })}>
                              <option value="">None</option>
                              {managers.data?.items.filter((m) => m.id !== u.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </td>
                          <td>{fmtDate(u.createdAt?.slice(0, 10))}</td>
                          <td>
                            <input type="checkbox" style={{ width: 'auto' }} aria-label={`Active: ${u.name}`} checked={u.isActive} disabled={isLoading || self}
                              onChange={(e) => change(u.id, { isActive: e.target.checked })} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={query.data.page} pages={query.data.pages} total={query.data.total} onChange={setPage} />
            </>
          )}
        </QueryState>
      </Card>
    </>
  );
}
