import { test, before, after, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { api, startDb, stopDb, resetDb, makeUser, punchBody } from './helpers.js';
import { Attendance } from '../src/models/Attendance.js';

before(startDb);
after(stopDb);
beforeEach(resetDb);

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);

describe('auth', () => {
  test('signup creates an employee only', async () => {
    const withRole = await api.post('/api/auth/signup').send({ name: 'Eve', email: 'eve@t.test', password: 'Passw0rd1', role: 'admin' });
    assert.equal(withRole.status, 400); // strict schema rejects a role field
    const ok = await api.post('/api/auth/signup').send({ name: 'Eve', email: 'eve@t.test', password: 'Passw0rd1' });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.user.role, 'employee');
    assert.equal(ok.body.user.passwordHash, undefined);
  });

  test('rejects duplicate email, weak password and wrong credentials', async () => {
    await makeUser('employee', { email: 'dup@t.test' });
    assert.equal((await api.post('/api/auth/signup').send({ name: 'X Y', email: 'dup@t.test', password: 'Passw0rd1' })).status, 409);
    assert.equal((await api.post('/api/auth/signup').send({ name: 'X Y', email: 'n@t.test', password: 'short' })).status, 400);
    assert.equal((await api.post('/api/auth/login').send({ email: 'dup@t.test', password: 'nope' })).status, 401);
  });

  test('protected routes require a token; role routes enforce RBAC', async () => {
    assert.equal((await api.get('/api/auth/me')).status, 401);
    const emp = await makeUser('employee');
    assert.equal((await api.get('/api/auth/me').set(emp.auth)).status, 200);
    assert.equal((await api.get('/api/users').set(emp.auth)).status, 403);
    assert.equal((await api.get('/api/attendance').set(emp.auth)).status, 403);
  });

  test('disabled accounts cannot use an existing token', async () => {
    const emp = await makeUser('employee');
    await emp.user.updateOne({ isActive: false });
    assert.equal((await api.get('/api/auth/me').set(emp.auth)).status, 401);
  });
});

describe('attendance', () => {
  test('punch in, duplicate prevented, punch out computes server-side hours', async () => {
    const emp = await makeUser('employee');
    const inRes = await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody());
    assert.equal(inRes.status, 201);
    assert.equal(inRes.body.attendance.status, 'in_progress');
    assert.equal(inRes.body.attendance.punchIn.selfie, undefined);

    assert.equal((await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody())).status, 409);

    await Attendance.updateOne({ user: emp.user._id }, { 'punchIn.at': hoursAgo(9) });
    const out = await api.post('/api/attendance/punch-out').set(emp.auth).send(punchBody({ workingMinutes: 1 }));
    assert.equal(out.status, 200);
    assert.equal(out.body.attendance.status, 'completed');
    assert.ok(out.body.attendance.workingMinutes >= 539 && out.body.attendance.workingMinutes <= 541);

    assert.equal((await api.post('/api/attendance/punch-out').set(emp.auth).send(punchBody())).status, 409);
  });

  test('under 8 hours is incomplete', async () => {
    const emp = await makeUser('employee');
    await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody());
    await Attendance.updateOne({ user: emp.user._id }, { 'punchIn.at': hoursAgo(7) });
    const out = await api.post('/api/attendance/punch-out').set(emp.auth).send(punchBody());
    assert.equal(out.body.attendance.status, 'incomplete');
  });

  test('punch-out without punch-in is rejected', async () => {
    const emp = await makeUser('employee');
    assert.equal((await api.post('/api/attendance/punch-out').set(emp.auth).send(punchBody())).status, 409);
  });

  test('concurrent punch-ins create a single record', async () => {
    const emp = await makeUser('employee');
    const results = await Promise.all([1, 2, 3].map(() => api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody())));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.equal(await Attendance.countDocuments({ user: emp.user._id }), 1);
  });

  test('validates selfie and location', async () => {
    const emp = await makeUser('employee');
    const post = (b) => api.post('/api/attendance/punch-in').set(emp.auth).send(b);
    assert.equal((await post(punchBody({ selfie: undefined }))).status, 400);
    assert.equal((await post(punchBody({ selfie: 'data:text/html;base64,PGI+' }))).status, 400);
    const fake = `data:image/jpeg;base64,${Buffer.from('not an image at all').toString('base64')}`;
    assert.equal((await post(punchBody({ selfie: fake }))).status, 400);
    assert.equal((await post(punchBody({ latitude: 200 }))).status, 400);
    assert.equal((await post(punchBody({ latitude: undefined }))).status, 400);
    assert.equal((await post(punchBody())).status, 201);
  });
});

describe('access control between users', () => {
  async function setup() {
    const manager = await makeUser('manager');
    const otherManager = await makeUser('manager');
    const admin = await makeUser('admin');
    const emp = await makeUser('employee', { manager: manager.user._id });
    const stranger = await makeUser('employee');
    const rec = (await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody())).body.attendance;
    return { manager, otherManager, admin, emp, stranger, rec };
  }

  test('selfie and record visible to owner, own manager and admin only', async () => {
    const { manager, otherManager, admin, emp, stranger, rec } = await setup();
    const get = (u) => api.get(rec.punchIn.selfieUrl).set(u.auth);
    for (const u of [emp, manager, admin]) {
      const res = await get(u);
      assert.equal(res.status, 200);
      assert.equal(res.headers['content-type'], 'image/jpeg');
    }
    assert.equal((await get(stranger)).status, 404);
    assert.equal((await get(otherManager)).status, 404);
    assert.equal((await api.get(rec.punchIn.selfieUrl)).status, 401);
    assert.equal((await api.get(`/api/attendance/${rec.id}`).set(stranger.auth)).status, 404);
  });

  test('team listing is scoped by role', async () => {
    const { manager, otherManager, admin, emp, rec } = await setup();
    const ids = async (u) => (await api.get('/api/attendance').set(u.auth)).body.items.map((i) => i.id);
    assert.deepEqual(await ids(manager), [rec.id]);
    assert.deepEqual(await ids(otherManager), []);
    assert.deepEqual(await ids(admin), [rec.id]);
    assert.equal((await api.get(`/api/attendance?userId=${emp.user._id}`).set(otherManager.auth)).status, 403);
    assert.equal((await api.get('/api/attendance/me').set(emp.auth)).body.total, 1);
  });

  test('verification: reviewers only, scoped, remarks required for invalid, no self-review', async () => {
    const { manager, otherManager, admin, emp, rec } = await setup();
    const patch = (u, body) => api.patch(`/api/attendance/${rec.id}/verification`).set(u.auth).send(body);
    assert.equal((await patch(emp, { status: 'valid' })).status, 403);
    assert.equal((await patch(otherManager, { status: 'valid' })).status, 403);
    assert.equal((await patch(manager, { status: 'invalid' })).status, 400);
    const ok = await patch(manager, { status: 'invalid', remarks: 'Photo is of a screen' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.attendance.verification.status, 'invalid');
    assert.equal(ok.body.attendance.verification.remarks, 'Photo is of a screen');
    assert.equal((await patch(admin, { status: 'valid' })).body.attendance.verification.status, 'valid');
    const own = (await api.post('/api/attendance/punch-in').set(manager.auth).send(punchBody())).body.attendance;
    assert.equal((await api.patch(`/api/attendance/${own.id}/verification`).set(manager.auth).send({ status: 'valid' })).status, 403);
  });
});

describe('overtime workflow', () => {
  async function completedDay(emp) {
    await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody());
    await Attendance.updateOne({ user: emp.user._id }, { 'punchIn.at': hoursAgo(10) });
    return (await api.post('/api/attendance/punch-out').set(emp.auth).send(punchBody())).body.attendance;
  }

  test('request, duplicate blocked, approval reflected in attendance, no re-decision', async () => {
    const manager = await makeUser('manager');
    const emp = await makeUser('employee', { manager: manager.user._id });
    const att = await completedDay(emp);

    const body = { attendanceId: att.id, requestedHours: 2, reason: 'Release support' };
    const created = await api.post('/api/overtime').set(emp.auth).send(body);
    assert.equal(created.status, 201);
    assert.equal((await api.post('/api/overtime').set(emp.auth).send(body)).status, 409);
    assert.equal((await api.get(`/api/attendance/${att.id}`).set(emp.auth)).body.attendance.overtimeStatus, 'pending');

    assert.equal((await api.get('/api/overtime?status=pending').set(manager.auth)).body.total, 1);
    const id = created.body.overtime.id;
    const decide = (u, b) => api.patch(`/api/overtime/${id}/decision`).set(u.auth).send(b);

    assert.equal((await decide(emp, { decision: 'approved' })).status, 403);
    assert.equal((await decide(manager, { decision: 'rejected' })).status, 400);
    const approved = await decide(manager, { decision: 'approved', remarks: 'ok' });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.overtime.status, 'approved');
    assert.equal((await api.get(`/api/attendance/${att.id}`).set(emp.auth)).body.attendance.overtimeStatus, 'approved');
    assert.equal((await decide(manager, { decision: 'approved' })).status, 409);
    assert.equal((await api.get('/api/overtime/me').set(emp.auth)).body.items[0].status, 'approved');
  });

  test('cannot request before punch-out or for another user; unrelated manager cannot decide', async () => {
    const manager = await makeUser('manager');
    const other = await makeUser('manager');
    const emp = await makeUser('employee', { manager: manager.user._id });
    const stranger = await makeUser('employee');
    const open = (await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody())).body.attendance;
    const ask = (u, id) => api.post('/api/overtime').set(u.auth).send({ attendanceId: id, requestedHours: 1, reason: 'work' });
    assert.equal((await ask(emp, open.id)).status, 409);
    assert.equal((await ask(stranger, open.id)).status, 404);

    await api.post('/api/attendance/punch-out').set(emp.auth).send(punchBody());
    const r = await ask(emp, open.id);
    assert.equal((await api.patch(`/api/overtime/${r.body.overtime.id}/decision`).set(other.auth).send({ decision: 'approved' })).status, 403);
    assert.equal((await api.get('/api/overtime').set(other.auth)).body.total, 0);
  });
});

describe('users, reports, dashboard', () => {
  test('admin manages users; cannot demote self; manager must be a manager', async () => {
    const admin = await makeUser('admin');
    const manager = await makeUser('manager');
    const emp = await makeUser('employee');
    assert.equal((await api.get('/api/users?search=employee').set(admin.auth)).status, 200);
    assert.equal((await api.patch(`/api/users/${admin.user._id}`).set(admin.auth).send({ role: 'employee' })).status, 400);
    assert.equal((await api.patch(`/api/users/${emp.user._id}`).set(admin.auth).send({ manager: String(admin.user._id) })).status, 400);
    assert.equal((await api.patch(`/api/users/${emp.user._id}`).set(admin.auth).send({ manager: String(manager.user._id) })).status, 200);
    assert.equal((await api.patch(`/api/users/${emp.user._id}`).set(admin.auth).send({ role: 'superuser' })).status, 400);
  });

  test('daily report is scoped and dashboards return role summaries', async () => {
    const manager = await makeUser('manager');
    const admin = await makeUser('admin');
    const emp = await makeUser('employee', { manager: manager.user._id });
    const other = await makeUser('employee');
    await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody());
    await api.post('/api/attendance/punch-in').set(other.auth).send(punchBody());

    const rows = async (u) => (await api.get('/api/reports/daily').set(u.auth)).body.rows.length;
    assert.equal(await rows(emp), 1);
    assert.equal(await rows(manager), 1);
    assert.equal(await rows(admin), 2);
    assert.equal((await api.get(`/api/reports/daily?userId=${other.user._id}`).set(manager.auth)).status, 403);
    assert.equal((await api.get('/api/reports/daily?date=2024-13-99').set(admin.auth)).status, 400);

    assert.equal((await api.get('/api/dashboard/summary').set(emp.auth)).body.role, 'employee');
    const m = await api.get('/api/dashboard/summary').set(manager.auth);
    assert.equal(m.body.teamSize, 1);
    assert.equal(m.body.presentToday, 1);
    assert.equal((await api.get('/api/dashboard/summary').set(admin.auth)).body.presentToday, 2);
  });
});
