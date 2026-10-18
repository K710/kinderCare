// Test 3.5: HealthRecord
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDB, teardownDB, startApp } from './setup.mjs';
import { seedBasic } from './fixtures.mjs';

process.env.LOG_LEVEL = 'error';
let app, M, ids, tok;

before(async () => {
  await setupDB();
  app = await startApp();
  ({ M, ids, tok } = await seedBasic(app));
});
after(async () => {
  await app.close();
  await teardownDB();
});

test('tạo lần đo: GV lớp bé 201 + bmi; GV khác 403; PH 403; ngoài khoảng/tương lai 400', async () => {
  let r = await app.call('POST', '/api/v1/health-records', {
    token: tok.t1, body: { student: ids.s1, measuredAt: '2026-09-01', height: 100, weight: 16 },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.bmi, 16);
  assert.equal(r.body.data.measuredAt, '2026-09-01T00:00:00.000Z');
  ids.h1 = r.body.data._id;

  r = await app.call('POST', '/api/v1/health-records', { token: tok.t2, body: { student: ids.s1, measuredAt: '2026-09-01', height: 100, weight: 16 } });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/health-records', { token: tok.p1, body: { student: ids.s1, measuredAt: '2026-09-01', height: 100, weight: 16 } });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/health-records', { token: tok.t1, body: { student: ids.s1, measuredAt: '2026-09-01', height: 250, weight: 16 } });
  assert.equal(r.status, 400);
  r = await app.call('POST', '/api/v1/health-records', { token: tok.t1, body: { student: ids.s1, measuredAt: '2099-01-01', height: 100, weight: 16 } });
  assert.equal(r.status, 400);
});

test('bulk cả lớp: upsert theo bé+ngày; HS lớp khác 400; GV khác 403', async () => {
  let r = await app.call('POST', '/api/v1/health-records/bulk', {
    token: tok.t1,
    body: { class: ids.c1, measuredAt: '2026-10-01', records: [{ student: ids.s1, height: 102, weight: 16.5 }, { student: ids.s2, height: 98, weight: 15 }] },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data, { created: 2, updated: 0, total: 2 });

  r = await app.call('POST', '/api/v1/health-records/bulk', {
    token: tok.t1, body: { class: ids.c1, measuredAt: '2026-10-01', records: [{ student: ids.s1, height: 103, weight: 16.5 }] },
  });
  assert.deepEqual(r.body.data, { created: 0, updated: 1, total: 1 });
  assert.equal(await M.HealthRecord.countDocuments({ student: ids.s1 }), 2);
  const doc = await M.HealthRecord.findOne({ student: ids.s1, measuredAt: new Date('2026-10-01T00:00:00Z') });
  assert.equal(doc.bmi, 15.6);

  r = await app.call('POST', '/api/v1/health-records/bulk', { token: tok.t1, body: { class: ids.c1, measuredAt: '2026-10-01', records: [{ student: ids.s3, height: 100, weight: 15 }] } });
  assert.equal(r.status, 400);
  r = await app.call('POST', '/api/v1/health-records/bulk', { token: tok.t2, body: { class: ids.c1, measuredAt: '2026-10-01', records: [{ student: ids.s1, height: 100, weight: 15 }] } });
  assert.equal(r.status, 403);
});

test('lịch sử bé: tăng dần + latest; PH của bé 200; PH khác 403; GV khác 403', async () => {
  let r = await app.call('GET', `/api/v1/health-records/student/${ids.s1}`, { token: tok.p1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.items.length, 2);
  assert.equal(r.body.data.items[0].height, 100);
  assert.equal(r.body.data.latest.height, 103);
  assert.equal(r.body.data.items[0].recordedBy.fullName, 'Cô Lan');

  r = await app.call('GET', `/api/v1/health-records/student/${ids.s1}`, { token: tok.p2 });
  assert.equal(r.status, 403);
  r = await app.call('GET', `/api/v1/health-records/student/${ids.s1}`, { token: tok.t2 });
  assert.equal(r.status, 403);
  r = await app.call('GET', `/api/v1/health-records/student/${ids.s1}`, { token: tok.principal });
  assert.equal(r.status, 200);
});

test('sửa: bmi tính lại; strict; GV khác 403; xoá', async () => {
  let r = await app.call('PATCH', `/api/v1/health-records/${ids.h1}`, { token: tok.t1, body: { weight: 20 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.bmi, 20);
  r = await app.call('PATCH', `/api/v1/health-records/${ids.h1}`, { token: tok.t1, body: { student: ids.s2 } });
  assert.equal(r.status, 400);
  r = await app.call('PATCH', `/api/v1/health-records/${ids.h1}`, { token: tok.t2, body: { weight: 1 } });
  assert.equal(r.status, 403);
  r = await app.call('DELETE', `/api/v1/health-records/${ids.h1}`, { token: tok.t1 });
  assert.equal(r.status, 200);
  r = await app.call('DELETE', `/api/v1/health-records/${ids.h1}`, { token: tok.t1 });
  assert.equal(r.status, 404);
});
