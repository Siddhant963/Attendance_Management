import { test, before, after, beforeEach, afterEach, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import { api, startDb, stopDb, resetDb, makeUser, punchBody, mongoose } from './helpers.js';
import { Attendance } from '../src/models/Attendance.js';
import { Selfie } from '../src/models/Selfie.js';
import { saveSelfie, readSelfie, deleteSelfie } from '../src/utils/selfieStorage.js';

before(startDb);
after(stopDb);
beforeEach(resetDb);
afterEach(() => mock.restoreAll());

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png-body-bytes')]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 0, 0, 0]), Buffer.from('WEBPVP8 data')]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 9)]);
const dataUrl = (type, bytes) => `data:image/${type};base64,${bytes.toString('base64')}`;
const userId = () => new mongoose.Types.ObjectId();

describe('selfie storage', () => {
  test('stores raw bytes and metadata, and reads them back unchanged', async () => {
    const uid = userId();
    for (const [type, bytes] of [['jpeg', jpeg], ['png', png], ['webp', webp]]) {
      const key = await saveSelfie(dataUrl(type, bytes), uid, 'in');
      const doc = await Selfie.findById(key).lean();
      assert.ok(Buffer.isBuffer(doc.data) || doc.data._bsontype === 'Binary', 'bytes stored as binary, not text');
      assert.equal(doc.contentType, `image/${type}`);
      assert.equal(doc.size, bytes.length);
      assert.equal(doc.kind, 'in');
      assert.equal(String(doc.user), String(uid));

      const read = await readSelfie(key);
      assert.equal(read.mime, `image/${type}`);
      assert.ok(read.data.equals(bytes));
    }
  });

  test('rejects invalid images and stores nothing', async () => {
    const big = Buffer.concat([jpeg, Buffer.alloc(1.5 * 1024 * 1024)]);
    const bad = [
      undefined,
      'not a data url',
      `data:text/html;base64,${Buffer.from('<b>x</b>').toString('base64')}`,
      dataUrl('jpeg', Buffer.from('plain text pretending to be a jpeg')),
      dataUrl('png', jpeg),
      'data:image/jpeg;base64,',
      dataUrl('jpeg', big),
    ];
    for (const input of bad) {
      await assert.rejects(saveSelfie(input, userId(), 'in'), (err) => err.status === 400);
    }
    assert.equal(await Selfie.countDocuments(), 0);
  });

  test('missing, malformed and legacy disk keys are 404', async () => {
    for (const key of [String(userId()), 'not-an-id', '64b0000000000000000000', 'someUserId/1700000000-in-abc123.jpeg', undefined]) {
      await assert.rejects(readSelfie(key), (err) => err.status === 404, String(key));
    }
  });

  test('deleteSelfie removes only the given image and tolerates bad keys', async () => {
    const keep = await saveSelfie(dataUrl('jpeg', jpeg), userId(), 'in');
    const drop = await saveSelfie(dataUrl('jpeg', jpeg), userId(), 'out');
    await deleteSelfie(drop);
    await deleteSelfie('legacy/disk/key.jpeg');
    assert.equal(await Selfie.countDocuments(), 1);
    assert.equal((await readSelfie(keep)).mime, 'image/jpeg');
  });
});

describe('selfie endpoint', () => {
  async function punchedIn(selfieBytes = png, type = 'png') {
    const manager = await makeUser('manager');
    const emp = await makeUser('employee', { manager: manager.user._id });
    const res = await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody({ selfie: dataUrl(type, selfieBytes) }));
    assert.equal(res.status, 201);
    return { manager, emp, record: res.body.attendance };
  }

  test('serves the stored bytes with their real content type and private headers', async () => {
    const { emp, record } = await punchedIn();
    const res = await api.get(record.punchIn.selfieUrl).set(emp.auth).buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'image/png');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.match(res.headers['cache-control'], /private/);
    assert.ok(res.body.equals(png));
  });

  test('is limited to the owner, their manager and admins', async () => {
    const { manager, emp, record } = await punchedIn();
    const admin = await makeUser('admin');
    const stranger = await makeUser('employee');
    const otherManager = await makeUser('manager');
    for (const u of [emp, manager, admin]) assert.equal((await api.get(record.punchIn.selfieUrl).set(u.auth)).status, 200);
    for (const u of [stranger, otherManager]) assert.equal((await api.get(record.punchIn.selfieUrl).set(u.auth)).status, 404);
    assert.equal((await api.get(record.punchIn.selfieUrl)).status, 401);
  });

  test('image bytes are never part of JSON responses or reachable as static files', async () => {
    const { emp, record } = await punchedIn();
    const listing = await api.get('/api/attendance/me').set(emp.auth);
    assert.ok(!JSON.stringify([record, listing.body]).includes(png.toString('base64')));
    assert.equal(record.punchIn.selfie, undefined);
    assert.equal((await api.get('/uploads/anything.png')).status, 404);
  });

  test('returns 404 when the image is missing and when no punch-out exists yet', async () => {
    const { emp, record } = await punchedIn();
    assert.equal((await api.get(record.punchIn.selfieUrl.replace('/in', '/out')).set(emp.auth)).status, 404);
    await Selfie.deleteMany({});
    assert.equal((await api.get(record.punchIn.selfieUrl).set(emp.auth)).status, 404);
  });

  test('a storage failure is a generic 500, not a leaked or successful response', async () => {
    const { emp, record } = await punchedIn();
    mock.method(Selfie, 'findById', () => Promise.reject(new Error('connection lost')));
    const res = await api.get(record.punchIn.selfieUrl).set(emp.auth);
    assert.equal(res.status, 500);
    assert.ok(!res.headers['content-type'].startsWith('image/'));
  });
});

describe('selfie cleanup around attendance writes', () => {
  test('successful punches keep both images', async () => {
    const emp = await makeUser('employee');
    await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody());
    await api.post('/api/attendance/punch-out').set(emp.auth).send(punchBody());
    assert.equal(await Selfie.countDocuments(), 2);
    const record = await Attendance.findOne({ user: emp.user._id });
    assert.ok(await Selfie.exists({ _id: record.punchIn.selfie }));
    assert.ok(await Selfie.exists({ _id: record.punchOut.selfie }));
  });

  test('a rejected selfie never reaches storage and creates no attendance', async () => {
    const emp = await makeUser('employee');
    const res = await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody({ selfie: 'data:image/jpeg;base64,AAAA' }));
    assert.equal(res.status, 400);
    assert.equal(await Selfie.countDocuments(), 0);
    assert.equal(await Attendance.countDocuments(), 0);
  });

  test('punch-in removes its image when the attendance write fails', async () => {
    const emp = await makeUser('employee');
    mock.method(Attendance, 'create', () => Promise.reject(new Error('write failed')));
    const res = await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody());
    assert.equal(res.status, 500);
    assert.equal(await Selfie.countDocuments(), 0);
  });

  test('punch-in removes its image on a duplicate-key conflict', async () => {
    const emp = await makeUser('employee');
    mock.method(Attendance, 'create', () => Promise.reject(Object.assign(new Error('dup'), { code: 11000 })));
    const res = await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody());
    assert.equal(res.status, 409);
    assert.equal(await Selfie.countDocuments(), 0);
  });

  test('concurrent punch-ins leave exactly one record and one image', async () => {
    const emp = await makeUser('employee');
    await Promise.all([1, 2, 3, 4].map(() => api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody())));
    assert.equal(await Attendance.countDocuments({ user: emp.user._id }), 1);
    assert.equal(await Selfie.countDocuments(), 1);
  });

  test('a lost punch-out race removes the new image but keeps the punch-in image', async () => {
    const emp = await makeUser('employee');
    await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody());
    mock.method(Attendance, 'findOneAndUpdate', () => Promise.resolve(null));
    const res = await api.post('/api/attendance/punch-out').set(emp.auth).send(punchBody());
    assert.equal(res.status, 409);
    assert.equal(await Selfie.countDocuments(), 1);
    const record = await Attendance.findOne({ user: emp.user._id });
    assert.ok(await Selfie.exists({ _id: record.punchIn.selfie }));
  });

  test('punch-out removes its image when the update throws', async () => {
    const emp = await makeUser('employee');
    await api.post('/api/attendance/punch-in').set(emp.auth).send(punchBody());
    mock.method(Attendance, 'findOneAndUpdate', () => Promise.reject(new Error('write failed')));
    const res = await api.post('/api/attendance/punch-out').set(emp.auth).send(punchBody());
    assert.equal(res.status, 500);
    assert.equal(await Selfie.countDocuments(), 1);
  });
});
