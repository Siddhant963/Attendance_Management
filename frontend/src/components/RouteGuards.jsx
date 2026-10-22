import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { selectAuthReady, selectToken, selectUser, setUser } from '../features/auth/authSlice.js';
import { endSession } from '../api/baseApi.js';
import { useGetMeQuery } from '../api/endpoints.js';
import { CenterLoader } from './ui.jsx';

/** Requires a session. On first load with a stored token, validates it against the server. */
export function RequireAuth() {
  const token = useSelector(selectToken);
  const ready = useSelector(selectAuthReady);
  const dispatch = useDispatch();
  const location = useLocation();
  const { data, isError } = useGetMeQuery(undefined, { skip: !token || ready });

  useEffect(() => {
    if (data?.user) dispatch(setUser(data.user));
  }, [data, dispatch]);
  useEffect(() => {
    if (isError) dispatch(endSession());
  }, [isError, dispatch]);

  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!ready) return <CenterLoader />;
  return <Outlet />;
}

/** Restricts a route group to specific roles (the server enforces the same rules). */
export function RequireRole({ roles }) {
  const user = useSelector(selectUser);
  return roles.includes(user?.role) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export function PublicOnly() {
  const token = useSelector(selectToken);
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
