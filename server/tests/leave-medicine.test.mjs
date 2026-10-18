// Test 3.7: LeaveRequest + MedicineNote
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

/* ---------- LeaveRequest ---------- */
test('leave: PH tạo cho con 201 (class từ bé); con người khác 403; toDate<fromDate 400; trùng khoảng 409; GV tạo 403', async () => {
  // 15/10 (T5) → 19/10 (T2): gồm T7, CN
  let r = await app.call('POST', '/api/v1/leave-requests', { token: tok.p1, body: { student: ids.s1, fromDate: '2026-10-15', toDate: '2026-10-19', reason: 'Về quê' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.class.name, 'Mầm 1');
  assert.equal(r.body.data.parent.fullName, 'PH An');
  assert.equal(r.body.data.status, 'pending');
  ids.lr1 = r.body.data._id;

  r = await app.call('POST', '/api/v1/leave-requests', { token: tok.p2, body: { student: ids.s1, fromDate: '2026-11-01', toDate: '2026-11-01', reason: 'Bé ốm' } });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/leave-requests', { token: tok.p1, body: { student: ids.s1, fromDate: '2026-11-02', toDate: '2026-11-01', reason: 'Bé ốm' } });
  assert.equal(r.status, 400);
  r = await app.call('POST', '/api/v1/leave-requests', { token: tok.p1, body: { student: ids.s1, fromDate: '2026-10-19', toDate: '2026-10-20', reason: 'Bé ốm' } });
  assert.equal(r.status, 409);
  r = await app.call('POST', '/api/v1/leave-requests', { token: tok.t1, body: { student: ids.s1, fromDate: '2026-11-01', toDate: '2026-11-01', reason: 'Bé ốm' } });
  assert.equal(r.status, 403);
});

test('leave: PH sửa/huỷ đơn pending; PH khác 403; list T lớp mình; /my', async () => {
  let r = await app.call('PATCH', `/api/v1/leave-requests/${ids.lr1}`, { token: tok.p1, body: { reason: 'Về quê thăm ông bà' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.reason, 'Về quê thăm ông bà');
  r = await app.call('PATCH', `/api/v1/leave-requests/${ids.lr1}`, { token: tok.p2, body: { reason: 'xxx' } });
  assert.equal(r.status, 403);

  r = await app.call('POST', '/api/v1/leave-requests', { token: tok.p2, body: { student: ids.s3, fromDate: '2026-10-20', toDate: '2026-10-20', reason: 'Khám bệnh' } });
  const lr2 = r.body.data._id;
  r = await app.call('GET', '/api/v1/leave-requests', { token: tok.t1 });
  assert.equal(r.body.data.length, 1, 't1 chỉ thấy đơn lớp c1');
  r = await app.call('GET', '/api/v1/leave-requests', { token: tok.principal });
  assert.equal(r.body.data.length, 2);
  r = await app.call('GET', `/api/v1/leave-requests?class=${ids.c2}`, { token: tok.t1 });
  assert.equal(r.status, 403);
  r = await app.call('GET', '/api/v1/leave-requests/my', { token: tok.p1 });
  assert.equal(r.body.data.length, 1);
  r = await app.call('GET', `/api/v1/leave-requests/${lr2}`, { token: tok.p1 });
  assert.equal(r.status, 200, 'p1 cũng là PH của s3');

  r = await app.call('DELETE', `/api/v1/leave-requests/${lr2}`, { token: tok.p2 });
  assert.equal(r.status, 200);
});

test('leave approve: GV lớp bé duyệt → Attendance excused T2–T6, bỏ T7/CN, không ghi đè; GV khác 403; duyệt lại 400', async () => {
  // Đã có điểm danh 15/10 present → không được ghi đè
  await M.Attendance.create({ student: ids.s1, class: ids.c1, date: new Date('2026-10-15T00:00:00Z'), status: 'present', markedBy: ids.t1 });

  let r = await app.call('PATCH', `/api/v1/leave-requests/${ids.lr1}/approve`, { token: tok.t2, body: {} });
  assert.equal(r.status, 403);
  r = await app.call('PATCH', `/api/v1/leave-requests/${ids.lr1}/approve`, { token: tok.t1, body: { note: 'OK' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.request.status, 'approved');
  assert.equal(r.body.data.request.reviewedBy.fullName, 'Cô Lan');
  assert.equal(r.body.data.days, 3, '15,16,19 (bỏ 17 T7, 18 CN)');
  assert.equal(r.body.data.attendanceCreated, 2, '15 đã có nên chỉ tạo 16 và 19');

  const att = await M.Attendance.find({ student: ids.s1 }).sort('date').lean();
  assert.deepEqual(att.map((a) => [a.date.toISOString().slice(0, 10), a.status]), [
    ['2026-10-15', 'present'], ['2026-10-16', 'excused'], ['2026-10-19', 'excused'],
  ]);

  r = await app.call('PATCH', `/api/v1/leave-requests/${ids.lr1}/approve`, { token: tok.t1, body: {} });
  assert.equal(r.status, 400);
  r = await app.call('PATCH', `/api/v1/leave-requests/${ids.lr1}`, { token: tok.p1, body: { reason: 'đổi' } });
  assert.equal(r.status, 400, 'đã duyệt không sửa');
  r = await app.call('DELETE', `/api/v1/leave-requests/${ids.lr1}`, { token: tok.p1 });
  assert.equal(r.status, 400);
});

test('leave reject cần lý do; đơn rejected không chặn tạo đơn mới trùng ngày', async () => {
  let r = await app.call('POST', '/api/v1/leave-requests', { token: tok.p2, body: { student: ids.s2, fromDate: '2026-10-21', toDate: '2026-10-21', reason: 'Bé ốm' } });
  const id = r.body.data._id;
  r = await app.call('PATCH', `/api/v1/leave-requests/${id}/reject`, { token: tok.t1, body: {} });
  assert.equal(r.status, 400);
  r = await app.call('PATCH', `/api/v1/leave-requests/${id}/reject`, { token: tok.t1, body: { note: 'Thiếu giấy khám' } });
  assert.equal(r.body.data.status, 'rejected');
  assert.equal(await M.Attendance.countDocuments({ student: ids.s2 }), 0);
  r = await app.call('POST', '/api/v1/leave-requests', { token: tok.p2, body: { student: ids.s2, fromDate: '2026-10-21', toDate: '2026-10-21', reason: 'Bé ốm (bổ sung giấy)' } });
  assert.equal(r.status, 201);
});

/* ---------- MedicineNote ---------- */
const meds = [{ name: 'Hapacol', dosage: '5ml', time: 'Sau ăn trưa' }];

test('medicine: PH tạo 201; thiếu thuốc 400; con người khác 403; list T lớp mình + lọc date; /my', async () => {
  let r = await app.call('POST', '/api/v1/medicine-notes', { token: tok.p1, body: { student: ids.s1, medicines: meds, fromDate: '2026-10-19', toDate: '2026-10-21' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.status, 'pending');
  assert.equal(r.body.data.class.name, 'Mầm 1');
  ids.mn1 = r.body.data._id;
  r = await app.call('POST', '/api/v1/medicine-notes', { token: tok.p1, body: { student: ids.s1, medicines: [], fromDate: '2026-10-19', toDate: '2026-10-21' } });
  assert.equal(r.status, 400);
  r = await app.call('POST', '/api/v1/medicine-notes', { token: tok.p2, body: { student: ids.s1, medicines: meds, fromDate: '2026-10-19', toDate: '2026-10-21' } });
  assert.equal(r.status, 403);

  r = await app.call('GET', '/api/v1/medicine-notes?date=2026-10-20', { token: tok.t1 });
  assert.equal(r.body.data.length, 1);
  r = await app.call('GET', '/api/v1/medicine-notes?date=2026-10-25', { token: tok.t1 });
  assert.equal(r.body.data.length, 0);
  r = await app.call('GET', '/api/v1/medicine-notes', { token: tok.t2 });
  assert.equal(r.body.data.length, 0);
  r = await app.call('GET', '/api/v1/medicine-notes/my', { token: tok.p1 });
  assert.equal(r.body.data.length, 1);
  r = await app.call('GET', `/api/v1/medicine-notes/${ids.mn1}`, { token: tok.p2 });
  assert.equal(r.status, 403);
});

test('medicine luồng: log trước confirm 400; T khác 403; confirm → log (givenBy) → done; PH sửa sau confirm 400; huỷ', async () => {
  let r = await app.call('POST', `/api/v1/medicine-notes/${ids.mn1}/logs`, { token: tok.t1, body: {} });
  assert.equal(r.status, 400);
  r = await app.call('PATCH', `/api/v1/medicine-notes/${ids.mn1}/confirm`, { token: tok.t2 });
  assert.equal(r.status, 403);
  r = await app.call('PATCH', `/api/v1/medicine-notes/${ids.mn1}`, { token: tok.p1, body: { medicines: [{ ...meds[0], dosage: '7ml' }] } });
  assert.equal(r.body.data.medicines[0].dosage, '7ml');

  r = await app.call('PATCH', `/api/v1/medicine-notes/${ids.mn1}/confirm`, { token: tok.t1 });
  assert.equal(r.body.data.status, 'confirmed');
  assert.equal(r.body.data.confirmedBy.fullName, 'Cô Lan');
  r = await app.call('PATCH', `/api/v1/medicine-notes/${ids.mn1}`, { token: tok.p1, body: { fromDate: '2026-10-20' } });
  assert.equal(r.status, 400);

  r = await app.call('POST', `/api/v1/medicine-notes/${ids.mn1}/logs`, { token: tok.t1, body: { note: 'Uống đủ' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.logs.length, 1);
  assert.equal(r.body.data.logs[0].givenBy.fullName, 'Cô Lan');
  r = await app.call('GET', `/api/v1/medicine-notes/${ids.mn1}`, { token: tok.p1 });
  assert.equal(r.body.data.logs[0].note, 'Uống đủ', 'PH thấy lịch sử');

  r = await app.call('PATCH', `/api/v1/medicine-notes/${ids.mn1}/done`, { token: tok.t1 });
  assert.equal(r.body.data.status, 'done');
  r = await app.call('PATCH', `/api/v1/medicine-notes/${ids.mn1}/cancel`, { token: tok.p1 });
  assert.equal(r.status, 400, 'done không huỷ');

  r = await app.call('POST', '/api/v1/medicine-notes', { token: tok.p2, body: { student: ids.s3, medicines: meds, fromDate: '2026-10-19', toDate: '2026-10-19' } });
  const mn2 = r.body.data._id;
  r = await app.call('PATCH', `/api/v1/medicine-notes/${mn2}/cancel`, { token: tok.p1 });
  assert.equal(r.status, 403, 'p1 là PH của s3 nhưng không phải người tạo');
  r = await app.call('PATCH', `/api/v1/medicine-notes/${mn2}/cancel`, { token: tok.p2 });
  assert.equal(r.body.data.status, 'cancelled');
});
