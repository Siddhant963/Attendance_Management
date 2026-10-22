import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../features/auth/authSlice.js';
import { useLoginMutation, useSignupMutation } from '../api/endpoints.js';
import { errorMessage } from '../api/baseApi.js';
import { Alert, Field, Icon, InputWithIcon } from '../components/ui.jsx';

// Opt-in helpers (VITE_SHOW_DEMO=true) for local evaluation or an isolated demo environment. They only pre-fill the
// form for accounts created by `npm run seed`; sign-in still goes through the real API.
const DEMO_PASSWORD = 'Demo@12345';
const DEMOS = [
  { role: 'Employee', email: 'employee.demo@attendflow.test' },
  { role: 'Manager', email: 'manager.demo@attendflow.test' },
  { role: 'Admin', email: 'admin.demo@attendflow.test' },
];
const showDemo = import.meta.env.VITE_SHOW_DEMO === 'true';

function AuthShell({ active, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-brand">
          <div className="mark">A</div>
          <h1>AttendFlow<span>.</span></h1>
          <p className="muted small">Live-selfie attendance, working hours and overtime approvals</p>
        </div>
        <div className="auth-tabs" role="tablist">
          <Link to="/login" role="tab" aria-selected={active === 'login'} className={active === 'login' ? 'active' : ''}>Log In</Link>
          <Link to="/signup" role="tab" aria-selected={active === 'signup'} className={active === 'signup' ? 'active' : ''}>Create Account</Link>
        </div>
        {subtitle && <p className="muted small" style={{ marginTop: 0 }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ id, autoComplete, value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <InputWithIcon
      id={id}
      icon="lock"
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      required
      value={value}
      onChange={onChange}
      trailing={
        <button type="button" className="btn ghost sm" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((v) => !v)}>
          <Icon name={visible ? 'visibility_off' : 'visibility'} className="icon-sm" />
        </button>
      }
    />
  );
}

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await login(form).unwrap();
      dispatch(setCredentials(res));
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in'));
    }
  };

  return (
    <AuthShell active="login">
      <form onSubmit={submit} noValidate>
        <Alert>{error}</Alert>
        <Field label="Email" id="email">
          <InputWithIcon id="email" icon="mail" type="email" autoComplete="username" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Password" id="password">
          <PasswordInput id="password" autoComplete="current-password" value={form.password} onChange={set('password')} />
        </Field>
        <button className="btn block" disabled={isLoading || !form.email || !form.password}>
          {isLoading ? 'Signing in…' : 'Sign in'} <Icon name="arrow_forward" className="icon-sm" />
        </button>
      </form>
      <p className="small muted" style={{ marginTop: 16 }}>
        New employee? <Link to="/signup">Create an account</Link>
      </p>
      {showDemo && (
        <div className="demo-box">
          <div className="demo-head"><Icon name="shield" className="icon-sm" /> Demo accounts (fill the form, then sign in)</div>
          <div className="row">
            {DEMOS.map((d) => (
              <button key={d.role} type="button" className="btn secondary sm" onClick={() => setForm({ email: d.email, password: DEMO_PASSWORD })}>
                {d.role}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [signup, { isLoading }] = useSignupMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await signup(form).unwrap();
      dispatch(setCredentials(res));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not create the account'));
    }
  };

  return (
    <AuthShell active="signup" subtitle="Sign up as an employee. Roles are assigned by an administrator.">
      <form onSubmit={submit} noValidate>
        <Alert>{error}</Alert>
        <Field label="Full name" id="name">
          <InputWithIcon id="name" icon="person" autoComplete="name" required value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email" id="email">
          <InputWithIcon id="email" icon="mail" type="email" autoComplete="username" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Password" id="password">
          <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
          <span className="small muted">At least 8 characters, with a letter and a number.</span>
        </Field>
        <button className="btn block" disabled={isLoading}>
          {isLoading ? 'Creating…' : 'Enroll as employee'} <Icon name="how_to_reg" className="icon-sm" />
        </button>
      </form>
      <p className="small muted" style={{ marginTop: 16 }}>
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
