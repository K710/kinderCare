// Test 3.3: Attendance
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDB, teardownDB, startApp } from './setup.mjs';
import { seedBasic } from './fixtures.mjs';

process.env.LOG_LEVEL = 'error';

let app, M, ids, tok;
const TODAY = '2026-10-16'; // thứ 6
const LAST_MONTH = '2026-09-15';

before(async () => {
  await setupDB();
  app = await startApp();
  ({ M, ids, tok } = await seedBasic(app));
});
after(async () => {
  await app.close();
  await teardownDB();
});

const bulk = (token, body) => app.call('POST', '/api/v1/attendance/bulk', { token, body });

test('bulk: GV lớp mình → upsert; GV lớp khác 403; principal 403; HS không thuộc lớp 400; ngày tương lai 400', async () => {
  let r = await bulk(tok.t1, {
    class: ids.c1, date: TODAY,
    records: [{ student: ids.s1, status: 'present', checkInAt: `${TODAY}T00:30:00Z` }, { student: ids.s2, status: 'absent', note: 'Ốm' }],
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data, { created: 2, updated: 0, total: 2 });

  // điểm danh lại → cập nhật
  r = await bulk(tok.t1, { class: ids.c1, date: TODAY, records: [{ student: ids.s2, status: 'late' }] });
  assert.deepEqual(r.body.data, { created: 0, updated: 1, total: 1 });
  assert.equal(await M.Attendance.countDocuments(), 2, 'không tạo trùng');

  r = await bulk(tok.t2, { class: ids.c1, date: TODAY, records: [{ student: ids.s1, status: 'present' }] });
  assert.equal(r.status, 403);
  r = await bulk(tok.principal, { class: ids.c1, date: TODAY, records: [{ student: ids.s1, status: 'present' }] });
  assert.equal(r.status, 403);
  r = await bulk(tok.t1, { class: ids.c1, date: TODAY, records: [{ student: ids.s3, status: 'present' }] });
  assert.equal(r.status, 400);
  r = await bulk(tok.t1, { class: ids.c1, date: '2099-01-01', records: [{ student: ids.s1, status: 'present' }] });
  assert.equal(r.status, 400);
});

test('date-key theo giờ VN: 17:00Z ngày 16 (= 00:00 VN ngày 17) lưu thành ngày 17', async () => {
  const r = await bulk(tok.t2, { class: ids.c2, date: '2026-10-16T17:00:00Z', records: [{ student: ids.s3, status: 'present' }] });
  assert.equal(r.status, 200);
  const doc = await M.Attendance.findOne({ student: ids.s3 });
  assert.equal(doc.date.toISOString(), '2026-10-17T00:00:00.000Z');
  assert.equal(doc.class.toString(), ids.c2, 'snapshot lớp');
});

test('list theo ngày: đủ HS, bé chưa điểm danh attendance=null; GV khác 403; PH 403; thiếu date/from-to 400', async () => {
  await M.Student.create({ fullName: 'Bé Mới', dateOfBirth: '2021-01-01', gender: 'female', class: ids.c1, parents: [ids.p1] });
  let r = await app.call('GET', `/api/v1/attendance?class=${ids.c1}&date=${TODAY}`, { token: tok.t1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.items.length, 3);
  const an = r.body.data.items.find((i) => i.student.fullName === 'Bé An');
  assert.equal(an.attendance.status, 'present');
  assert.equal(r.body.data.items.find((i) => i.student.fullName === 'Bé Mới').attendance, null);

  r = await app.call('GET', `/api/v1/attendance?class=${ids.c1}&date=${TODAY}`, { token: tok.principal });
  assert.equal(r.status, 200);
  r = await app.call('GET', `/api/v1/attendance?class=${ids.c1}&date=${TODAY}`, { token: tok.t2 });
  assert.equal(r.status, 403);
  r = await app.call('GET', `/api/v1/attendance?class=${ids.c1}&date=${TODAY}`, { token: tok.p1 });
  assert.equal(r.status, 403);
  r = await app.call('GET', `/api/v1/attendance?class=${ids.c1}`, { token: tok.t1 });
  assert.equal(r.status, 400);
});

test('list theo khoảng ngày: trả bản ghi thô kèm student', async () => {
  await bulk(tok.t1, { class: ids.c1, date: LAST_MONTH, records: [{ student: ids.s1, status: 'excused' }] });
  let r = await app.call('GET', `/api/v1/attendance?class=${ids.c1}&from=2026-09-01&to=2026-10-31`, { token: tok.t1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.items.length, 3);
  assert.equal(r.body.data.items[0].student.fullName, 'Bé An');
  r = await app.call('GET', `/api/v1/attendance?class=${ids.c1}&from=2026-10-31&to=2026-09-01`, { token: tok.t1 });
  assert.equal(r.status, 400);
});

test('lịch sử 1 bé: PH của bé 200 kèm summary + lọc tháng; PH khác 403; GV lớp bé 200; GV khác 403', async () => {
  let r = await app.call('GET', `/api/v1/attendance/student/${ids.s1}`, { token: tok.p1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.items.length, 2);
  assert.deepEqual(r.body.data.summary, { present: 1, absent: 0, late: 0, excused: 1 });

  r = await app.call('GET', `/api/v1/attendance/student/${ids.s1}?month=2026-10`, { token: tok.p1 });
  assert.equal(r.body.data.items.length, 1);
  r = await app.call('GET', `/api/v1/attendance/student/${ids.s1}?month=2026-13`, { token: tok.p1 });
  assert.equal(r.status, 400);

  r = await app.call('GET', `/api/v1/attendance/student/${ids.s1}`, { token: tok.p2 });
  assert.equal(r.status, 403);
  r = await app.call('GET', `/api/v1/attendance/student/${ids.s1}`, { token: tok.t1 });
  assert.equal(r.status, 200);
  r = await app.call('GET', `/api/v1/attendance/student/${ids.s1}`, { token: tok.t2 });
  assert.equal(r.status, 403);
});

test('PATCH /:id: GV lớp mình sửa được; GV khác 403; trường lạ 400; id lạ 404', async () => {
  const doc = await M.Attendance.findOne({ student: ids.s2 });
  let r = await app.call('PATCH', `/api/v1/attendance/${doc.id}`, { token: tok.t1, body: { status: 'present', checkOutAt: `${TODAY}T10:00:00Z` } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.status, 'present');
  r = await app.call('PATCH', `/api/v1/attendance/${doc.id}`, { token: tok.t2, body: { status: 'absent' } });
  assert.equal(r.status, 403);
  r = await app.call('PATCH', `/api/v1/attendance/${doc.id}`, { token: tok.t1, body: { foo: 1 } });
  assert.equal(r.status, 400);
  r = await app.call('PATCH', `/api/v1/attendance/64b000000000000000000000`, { token: tok.t1, body: { status: 'absent' } });
  assert.equal(r.status, 404);
});

test('stats tháng: principal 200 theo lớp với rate; teacher 403', async () => {
  let r = await app.call('GET', '/api/v1/attendance/stats?month=2026-10', { token: tok.principal });
  assert.equal(r.status, 200);
  const c1 = r.body.data.find((x) => x.class.name === 'Mầm 1');
  assert.equal(c1.total, 2);
  assert.deepEqual(c1.counts, { present: 2, absent: 0, late: 0, excused: 0 });
  assert.equal(c1.rate, 100);
  const c2 = r.body.data.find((x) => x.class.name === 'Chồi 1');
  assert.equal(c2.total, 1);

  r = await app.call('GET', `/api/v1/attendance/stats?month=2026-10&class=${ids.c1}`, { token: tok.principal });
  assert.equal(r.body.data.length, 1);
  r = await app.call('GET', '/api/v1/attendance/stats?month=2026-10', { token: tok.t1 });
  assert.equal(r.status, 403);
});
