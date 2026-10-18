// Test 3.10: AuditLog + Dashboard
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDB, teardownDB, startApp } from './setup.mjs';
import { seedBasic } from './fixtures.mjs';

process.env.LOG_LEVEL = 'error';
let app, M, ids, tok;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  await setupDB();
  app = await startApp();
  ({ M, ids, tok } = await seedBasic(app));
});
after(async () => {
  await app.close();
  await teardownDB();
});

test('audit: login (kể cả thất bại) ghi log, password bị che; tạo học phí ghi CREATE_TUITION với resourceId; list/filter chỉ admin', async () => {
  await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'admin@kc.vn', password: 'sai' } });
  const r0 = await app.call('POST', '/api/v1/tuitions', {
    token: tok.principal, body: { student: ids.s1, month: '2026-10', items: [{ name: 'Học phí', amount: 2000000 }], dueDate: '2026-10-10' },
  });
  await wait(150); // audit ghi sau khi response kết thúc

  const logins = await M.AuditLog.find({ action: 'LOGIN' }).sort('createdAt').lean();
  assert.ok(logins.length >= 7, 'seed login 6 lần + 1 lần sai');
  const failed = logins.find((l) => l.statusCode === 401);
  assert.ok(failed);
  assert.equal(failed.payload.password, '***');
  assert.equal(failed.user, null);

  const created = await M.AuditLog.findOne({ action: 'CREATE_TUITION' }).lean();
  assert.ok(created);
  assert.equal(created.user.toString(), ids.principal);
  assert.equal(created.resource, 'Tuition');
  assert.equal(created.statusCode, 201);

  let r = await app.call('GET', '/api/v1/audit-logs?action=CREATE_TUITION', { token: tok.admin });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].user.fullName, 'Hiệu trưởng');
  assert.equal('payload' in r.body.data[0], false, 'list không kèm payload');
  r = await app.call('GET', `/api/v1/audit-logs/${r.body.data[0]._id}`, { token: tok.admin });
  assert.equal(r.body.data.payload.month, '2026-10');
  r = await app.call('GET', `/api/v1/audit-logs?user=${ids.principal}`, { token: tok.admin });
  assert.ok(r.body.data.every((l) => l.user._id === ids.principal));
  r = await app.call('GET', '/api/v1/audit-logs/actions', { token: tok.admin });
  assert.ok(r.body.data.includes('LOGIN') && r.body.data.includes('CREATE_TUITION'));
  r = await app.call('GET', '/api/v1/audit-logs', { token: tok.principal });
  assert.equal(r.status, 403);

  // TTL index tồn tại
  const idx = await M.AuditLog.collection.indexes();
  assert.ok(idx.some((i) => i.expireAfterSeconds === 180 * 86400));
  assert.equal(r0.status, 201);
});

test('dashboard principal: tổng số, điểm danh hôm nay, học phí tháng, chờ duyệt; teacher gọi 403', async () => {
  const { todayKey, monthKey } = await import('../src/utils/date.js');
  await M.Attendance.create({ student: ids.s1, class: ids.c1, date: todayKey(), status: 'present', markedBy: ids.t1 });
  await M.LeaveRequest.create({ student: ids.s2, class: ids.c1, parent: ids.p2, fromDate: todayKey(), toDate: todayKey(), reason: 'Bé ốm' });
  await M.Tuition.create({
    student: ids.s2, class: ids.c1, schoolYear: ids.sy, month: monthKey(), items: [{ name: 'HP', amount: 1000000 }], amount: 1000000, dueDate: todayKey(), paymentCode: 'HPAAAABBBB', createdBy: ids.principal,
  });

  let r = await app.call('GET', '/api/v1/dashboard/principal', { token: tok.principal });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.totals, { students: 3, teachers: 2, classes: 2 });
  assert.equal(r.body.data.attendanceToday.total, 3);
  assert.equal(r.body.data.attendanceToday.present, 1);
  assert.equal(r.body.data.attendanceToday.unmarked, 2);
  assert.equal(r.body.data.tuitionThisMonth.count, 2, 'tháng 2026-10: 1 từ test audit + 1 mới');
  assert.equal(r.body.data.pending.leaveRequests, 1);
  assert.equal(r.body.data.pending.menus, 0);
  r = await app.call('GET', '/api/v1/dashboard/principal', { token: tok.admin });
  assert.equal(r.status, 200);
  r = await app.call('GET', '/api/v1/dashboard/principal', { token: tok.t1 });
  assert.equal(r.status, 403);
});

test('dashboard teacher: lớp mình + sĩ số, điểm danh/nhận xét hôm nay, chờ duyệt lớp mình', async () => {
  let r = await app.call('GET', '/api/v1/dashboard/teacher', { token: tok.t1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.classes.length, 1);
  assert.equal(r.body.data.classes[0].studentCount, 2);
  assert.equal(r.body.data.attendanceToday.total, 2);
  assert.equal(r.body.data.attendanceToday.marked, 1);
  assert.deepEqual(r.body.data.dailyReportsToday, { done: 0, total: 2 });
  assert.equal(r.body.data.pending.leaveRequests, 1);
  r = await app.call('GET', '/api/v1/dashboard/teacher', { token: tok.t2 });
  assert.equal(r.body.data.pending.leaveRequests, 0);
  assert.equal(r.body.data.attendanceToday.total, 1);
  r = await app.call('GET', '/api/v1/dashboard/teacher', { token: tok.p1 });
  assert.equal(r.status, 403);
});

test('dashboard parent: theo con có điểm danh/nhận xét hôm nay và học phí chưa đóng', async () => {
  let r = await app.call('GET', '/api/v1/dashboard/parent', { token: tok.p2 });
  assert.equal(r.status, 200);
  const binh = r.body.data.children.find((c) => c.fullName === 'Bé Bình');
  assert.equal(binh.attendanceToday, null);
  assert.equal(binh.tuitionDue.count, 1);
  assert.equal(binh.tuitionDue.amount, 1000000);
  assert.equal(binh.tuitionDue.items[0].paymentCode, 'HPAAAABBBB');
  const cuc = r.body.data.children.find((c) => c.fullName === 'Bé Cúc');
  assert.equal(cuc.tuitionDue.count, 0);

  r = await app.call('GET', '/api/v1/dashboard/parent', { token: tok.p1 });
  const an = r.body.data.children.find((c) => c.fullName === 'Bé An');
  assert.equal(an.attendanceToday.status, 'present');
  assert.equal(an.class.name, 'Mầm 1');
  assert.equal(typeof r.body.data.unreadNotifications, 'number');
});

test('dashboard admin: tài khoản theo role, đăng nhập gần đây, audit hôm nay', async () => {
  let r = await app.call('GET', '/api/v1/dashboard/admin', { token: tok.admin });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.usersByRole, { admin: 1, principal: 1, teacher: 2, parent: 2 });
  assert.equal(r.body.data.totalUsers, 6);
  assert.equal(r.body.data.lockedUsers, 0);
  assert.ok(r.body.data.recentLogins.length >= 6);
  assert.ok(r.body.data.auditLogsToday > 0);
  r = await app.call('GET', '/api/v1/dashboard/admin', { token: tok.principal });
  assert.equal(r.status, 403);
});
