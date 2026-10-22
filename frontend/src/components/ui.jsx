import { useEffect } from 'react';

export function Icon({ name, className = '', ...rest }) {
  if (!name) return null;
  return <span className={`material-symbols-outlined ${className}`} aria-hidden="true" {...rest}>{name}</span>;
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function CenterLoader() {
  return (
    <div className="center-screen">
      <Spinner />
    </div>
  );
}

export function Alert({ tone = 'error', icon, children }) {
  if (!children) return null;
  const defaultIcon = tone === 'error' ? 'error' : tone === 'success' ? 'check_circle' : 'info';
  return (
    <div className={`alert ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={icon || defaultIcon} className="icon-sm" />
      <span>{children}</span>
    </div>
  );
}

export function Badge({ map, value }) {
  const { label, tone } = map[value] || { label: value, tone: 'neutral' };
  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

export function Card({ title, icon, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-title">
          <h2>{icon && <Icon name={icon} />}{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon, tone }) {
  return (
    <div className={`stat ${tone ? `tone-${tone}` : ''}`}>
      <div className="label">{icon && <Icon name={icon} className="icon-sm" style={{ marginRight: 4 }} />}{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

/** Text input with a leading icon and an optional trailing control (for example a visibility toggle). */
export function InputWithIcon({ icon, trailing, ...input }) {
  return (
    <div className={`input-icon ${trailing ? 'has-trail' : ''}`}>
      <Icon name={icon} className="icon-sm lead" />
      <input {...input} />
      {trailing && <div className="trail">{trailing}</div>}
    </div>
  );
}

export function Field({ label, id, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <span className="error">{error}</span>}
    </div>
  );
}

/** Wraps a query result: loading spinner, error, empty state, otherwise renders children. */
export function QueryState({ query, isEmpty, emptyText = 'Nothing to show yet.', children }) {
  if (query.isLoading) return <CenterLoader />;
  if (query.isError) {
    return (
      <Alert>
        {query.error?.data?.message || 'Could not load data.'}{' '}
        <button className="btn ghost sm" onClick={query.refetch}>Retry</button>
      </Alert>
    );
  }
  if (isEmpty) return <div className="empty">{emptyText}</div>;
  return children;
}

export function Pagination({ page, pages, total, onChange }) {
  if (!total) return null;
  return (
    <div className="pagination">
      <span>{total} records</span>
      <button className="btn secondary sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button className="btn secondary sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}

export function Modal({ title, onClose, narrow, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${narrow ? 'narrow' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
