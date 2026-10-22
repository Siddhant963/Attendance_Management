# AttendFlow — Attendance Management System

MERN application for tracking employee attendance with a live selfie and browser location, an overtime approval workflow, attendance verification and daily reports. Roles: **Employee**, **Manager**, **Admin**.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19, Vite, Redux Toolkit + RTK Query, React Router |
| Backend | Node.js, Express 5, Mongoose, Zod validation, JWT, Winston + Morgan logging |
| Database | MongoDB |

## Setup

Requirements: Node 20.19+ and a MongoDB instance (local or Atlas).

```bash
# Backend
cd backend
cp .env.example .env        # set MONGODB_URI and a long random JWT_SECRET
npm install
npm run seed                # optional, local evaluation only: creates demo accounts (see Demo accounts)
npm run dev                 # http://localhost:5000

# Frontend (second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to the backend)
```

Tests (backend; uses an in-memory MongoDB, downloaded on first run): `cd backend && npm test`
Production build (frontend): `cd frontend && npm run build`

### Environment

Backend (`backend/.env`, see `backend/.env.example`):

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string. Selfies are stored in the same database. |
| `JWT_SECRET` | yes | Long random string; never reuse a development value. |
| `CLIENT_ORIGIN` | in production | Comma-separated allowed frontend origins, no trailing slash. Defaults to `http://localhost:5173`, so browser requests from a deployed frontend are blocked until it is set. |
| `NODE_ENV` | in production | Set to `production` (hides internal error messages, JSON logs, blocks the demo seed). |
| `PORT` | no | Defaults to 5000; hosts such as Render provide it. |
| `JWT_EXPIRES_IN` | no | Defaults to `1d`. |
| `APP_TIMEZONE` | no | Business timezone for attendance days; defaults to `Asia/Kolkata`. |
| `DNS_SERVERS` | no | Comma-separated DNS servers for Node, for example `1.1.1.1,8.8.8.8`. Only needed when a `mongodb+srv://` URI fails with `querySrv ECONNREFUSED` because the local router refuses SRV lookups. |
| `ALLOW_DEMO_SEED` | no | Only read by `npm run seed`; see Demo accounts. |

Frontend (`frontend/.env`, see `frontend/.env.example`). Vite reads these at **build time**:

| Variable | Notes |
| --- | --- |
| `VITE_API_URL` | Deployed backend API, ending in `/api` (for example `https://<your-backend-host>/api`). Leave unset in development; Vite proxies `/api` to `localhost:5000`. |
| `VITE_SHOW_DEMO` | Demo-login helpers are shown only when this is exactly `true`. Use `false` or leave it unset for any real deployment. |

### Demo accounts (local evaluation or an isolated demo environment only)

`npm run seed` creates one demo account per role (employee, manager, admin) with a shared sample password, and prints the emails and password when it finishes. The employee is assigned to the demo manager. The accounts sign in through the normal login endpoint, so they get no special access, but the admin account is a real administrator: **never seed it into a database that holds real users.**

- The seed refuses to run when `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true` is set explicitly.
- The login page shows the "Demo accounts" helper only in a frontend built with `VITE_SHOW_DEMO=true`. The helper merely pre-fills the form. Hiding it is a convenience, not a security control; the backend enforces all authentication and authorization.
- Public signup always creates employees. An admin promotes users and assigns managers from the Users page.

To offer demo logins to evaluators safely, run a separate demo environment: a separate Atlas database (for example `attendflow_demo`) with its own `MONGODB_URI` and `JWT_SECRET`, a separate backend service pointing at it, and a separate frontend build with `VITE_SHOW_DEMO=true` and `VITE_API_URL` pointing at that backend. Run `ALLOW_DEMO_SEED=true npm run seed` once against the demo database, use synthetic data only, and drop the database when the evaluation ends.

## Deployment

The frontend and backend are separate services.

**Database (MongoDB Atlas or any persistent MongoDB):** create a database user and allow the backend host's outbound IPs in the network access list. Use the connection string as `MONGODB_URI`.

**Backend (Render or similar, Node 20.19+):** root directory `backend`; build `npm ci --omit=dev`; start `npm start`; health check `/api/health`. Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` and `CLIENT_ORIGIN` (the frontend's exact origin).

**Frontend (Vercel):** root directory `frontend`; framework preset Vite (build `npm run build`, output `dist`). Set `VITE_API_URL` (ending in `/api`) and `VITE_SHOW_DEMO=false` before building. `frontend/vercel.json` rewrites every path except `/api/...` to `index.html`, so refreshing or opening `/dashboard`, `/reports` or `/users` directly loads the app. API calls are not rewritten; the backend stays a separate service. On Netlify use an equivalent rule, `/* /index.html 200`, in a `_redirects` file.

**First administrator in a real deployment:** the demo seed is blocked in production and signup only creates employees, so promote one account directly in the database after it signs up, for example `db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })`. That admin assigns every other role from the Users page.

## Architecture

```
backend/src
  config/       env, logger (Winston), db connection
  models/       User, Attendance, OvertimeRequest, Selfie
  middleware/   authenticate / authorize (RBAC), zod validate, error handler
  validators.js request schemas
  services/     business rules (punching, overtime, verification, access scope)
  controllers/  thin HTTP layer
  routes/       route table with per-route role guards
  utils/        selfie storage (MongoDB), business-date helper, ApiError
frontend/src
  api/          RTK Query base API + endpoint definitions
  features/     auth slice (token, current user)
  components/   reusable UI, camera capture, selfie viewer, layout, route guards
  pages/        one file per screen group
```

Key design points:

- **Access scope** (`scopeService`): employees see only themselves; managers see the employees whose `manager` is them; admins see everyone. Every attendance, selfie, report and overtime query is filtered through it, and reviewers can never verify or approve their own records.
- **Duplicate punch prevention**: a unique index on `(user, date)` plus guarded updates. Concurrent punch-ins create one record; a second punch-out matches nothing and returns 409.
- **Working hours** are computed on the server from stored punch timestamps; clients cannot send them. `>= 8h` → *Completed*, `< 8h` → *Incomplete*, punched in only → *In progress*.
- **Selfies** are captured from the camera via `getUserMedia` (no file input), sent as a JPEG data URL, validated (type, size, magic bytes) and stored as binary documents in a dedicated `selfies` collection of the same MongoDB database, so they survive restarts and redeploys on hosts with ephemeral disks. They are never served statically; `GET /api/attendance/:id/selfie/:in|out` checks the caller's access, and the UI loads them with the bearer token.
- **Overtime**: employees request against a punched-out day (one request per day); the manager or admin approves or rejects (rejection needs a remark). The decision is written to the attendance record's `overtimeStatus`.
- **Verification**: managers/admins mark a record *Valid* or *Invalid* (remark required for invalid) and add notes.

### Screens

Login · Signup · Employee dashboard · Punch in/out (camera + location) · My attendance (with overtime request) · My overtime · Manager dashboard · Admin dashboard · Overtime approvals · Attendance verification · Daily report. The admin also has a Users page (roles, manager assignment, activate/disable).

### API summary

`POST /api/auth/signup|login`, `GET /api/auth/me` · `POST /api/attendance/punch-in|punch-out`, `GET /api/attendance/current|me`, `GET /api/attendance` (manager/admin), `GET /api/attendance/:id`, `GET /api/attendance/:id/selfie/:kind`, `PATCH /api/attendance/:id/verification` · `POST /api/overtime`, `GET /api/overtime/me`, `GET /api/overtime`, `PATCH /api/overtime/:id/decision` · `GET /api/users`, `PATCH /api/users/:id` (admin), `GET /api/users/options|managers` · `GET /api/reports/daily` · `GET /api/dashboard/summary`.

## Features implemented

Authentication (bcrypt + JWT), RBAC on frontend and backend, punch in/out with live selfie and geolocation, server-side hours and status, overtime request/approval, verification with remarks, role-specific dashboards, daily report (own / team / all), filters (date range, user, status, verification), pagination, request validation, centralized error handling, request logging, auth rate limiting, responsive layout, print-friendly report.

Not implemented: geofencing, notifications, Socket.IO, dark mode, PDF/Excel export.

## Assumptions

- Attendance days are calendar days in `APP_TIMEZONE`; one record per user per day. A user with an unclosed record from an earlier day must punch out of it before punching in again.
- Selfies are checked by people, not by software; the app makes no biometric or face-matching claims.
- Managers are linked to employees by an admin; a manager's own records are reviewed by an admin.
- Browsers require HTTPS (or localhost) for camera and location access.
- The daily report lists recorded attendance for the date; it does not infer absences.
- Tokens are kept in `localStorage` for simplicity.

## Storage and known limitations

- **Selfie storage:** each selfie is one document (raw bytes, MIME type, size, owner, in/out) of at most 1.5 MB; a 640px camera JPEG is typically a few tens of kilobytes. Selfies are only read by id through the authorized endpoint. A selfie written for a punch that then fails is deleted. Watch database size on small Atlas tiers; if storage volume ever outgrows MongoDB, only `backend/src/utils/selfieStorage.js` needs replacing (for example with object storage).
- **Migration from the earlier disk-based version:** attendance records created before this change reference files on a server disk and are not migrated. Their selfies now show as unavailable. This only affects databases used with that earlier build; start new deployments from an empty database, or re-capture.
- Camera and location need HTTPS (or localhost). Camera and GPS behaviour has been exercised with a fake camera and emulated location, not on physical devices.
- No refresh tokens or token revocation beyond disabling the account; rate limiting is per backend instance and applies to the login and signup routes.
