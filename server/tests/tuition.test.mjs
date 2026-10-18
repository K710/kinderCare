// Test 3.8: Tuition
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { setupDB, teardownDB, startApp } from './setup.mjs';
import { seedBasic } from './fixtures.mjs';

process.env.LOG_LEVEL = 'error';
let app, M, ids, tok, svc;
const items = [{ name: 'Học phí', amount: 2000000 }, { name: 'Tiền ăn', amount: 800000 }];

before(async () => {
  await setupDB();
  app = await startApp();
  ({ M, ids, tok } = await seedBasic(app));
  svc = await import('../src/services/tuition.service.js');
});
after(async () => {
  await app.close();
  await teardownDB();
});

test('tạo 1 bản ghi: P 201 với paymentCode HP+8, amount = Σ items; trùng tháng 409; admin tạo 403; tháng sai 400', async () => {
  let r = await app.call('POST', '/api/v1/tuitions', { token: tok.principal, body: { student: ids.s1, month: '2026-10', items, dueDate: '2026-10-10' } });
  assert.equal(r.status, 201);
  assert.match(r.body.data.paymentCode, /^HP[A-Z0-9]{8}$/);
  assert.equal(r.body.data.amount, 2800000);
  assert.equal(r.body.data.status, 'unpaid');
  assert.equal(r.body.data.class.name, 'Mầm 1');
  assert.equal(r.body.data.schoolYear.name, '2025-2026');
  ids.tu1 = r.body.data._id;
  ids.code1 = r.body.data.paymentCode;

  r = await app.call('POST', '/api/v1/tuitions', { token: tok.principal, body: { student: ids.s1, month: '2026-10', items, dueDate: '2026-10-10' } });
  assert.equal(r.status, 409);
  r = await app.call('POST', '/api/v1/tuitions', { token: tok.admin, body: { student: ids.s1, month: '2026-11', items, dueDate: '2026-11-10' } });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/tuitions', { token: tok.principal, body: { student: ids.s1, month: '2026-13', items, dueDate: '2026-11-10' } });
  assert.equal(r.status, 400);
});

test('bulk theo lớp: bỏ qua bé đã có; mã HP duy nhất; chạy lại → created 0', async () => {
  let r = await app.call('POST', '/api/v1/tuitions/bulk', { token: tok.principal, body: { class: ids.c1, month: '2026-10', items, dueDate: '2026-10-10' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.created, 1);
  assert.deepEqual(r.body.data.skipped.map((s) => s.fullName), ['Bé An'], 's1 đã có, tạo cho s2');
  assert.equal(r.body.data.total, 2);
  r = await app.call('POST', '/api/v1/tuitions/bulk', { token: tok.principal, body: { class: ids.c1, month: '2026-10', items, dueDate: '2026-10-10' } });
  assert.equal(r.body.data.created, 0);
  assert.equal(r.body.data.skipped.length, 2);
  r = await app.call('POST', '/api/v1/tuitions/bulk', { token: tok.principal, body: { class: ids.c2, month: '2026-10', items: [{ name: 'Học phí', amount: 1500000 }], dueDate: '2026-10-10' } });
  assert.equal(r.body.data.created, 1);
  assert.deepEqual(r.body.data.skipped, []);

  const codes = (await M.Tuition.find().lean()).map((t) => t.paymentCode);
  assert.equal(new Set(codes).size, 3);
});

test('list P: filter class/month/status/search tên và mã; teacher 403', async () => {
  let r = await app.call('GET', `/api/v1/tuitions?month=2026-10`, { token: tok.principal });
  assert.equal(r.body.pagination.total, 3);
  r = await app.call('GET', `/api/v1/tuitions?class=${ids.c1}`, { token: tok.principal });
  assert.equal(r.body.data.length, 2);
  r = await app.call('GET', `/api/v1/tuitions?search=${ids.code1}`, { token: tok.principal });
  assert.equal(r.body.data.length, 1);
  r = await app.call('GET', `/api/v1/tuitions?search=bé an`, { token: tok.principal });
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].student.fullName, 'Bé An');
  r = await app.call('GET', '/api/v1/tuitions', { token: tok.t1 });
  assert.equal(r.status, 403);
});

test('PH: /my trả học phí các con; chi tiết của con 200, con người khác 403', async () => {
  let r = await app.call('GET', '/api/v1/tuitions/my', { token: tok.p1 });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.map((t) => t.student.fullName).sort(), ['Bé An', 'Bé Cúc']);
  r = await app.call('GET', `/api/v1/tuitions/${ids.tu1}`, { token: tok.p1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.paymentCode, ids.code1);
  r = await app.call('GET', `/api/v1/tuitions/${ids.tu1}`, { token: tok.p2 });
  assert.equal(r.status, 403);
  r = await app.call('GET', '/api/v1/tuitions/my?status=paid', { token: tok.p1 });
  assert.equal(r.body.data.length, 0);
});

test('sửa items → amount đổi; đã có tiền: thiếu lý do 400, amount < paid 400, hợp lệ 200 + AuditLog; xoá khi có tiền 400', async () => {
  let r = await app.call('PATCH', `/api/v1/tuitions/${ids.tu1}`, { token: tok.principal, body: { items: [{ name: 'Học phí', amount: 2500000 }] } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.amount, 2500000);
  r = await app.call('PATCH', `/api/v1/tuitions/${ids.tu1}`, { token: tok.principal, body: { student: ids.s2 } });
  assert.equal(r.status, 400);

  await M.Tuition.updateOne({ _id: ids.tu1 }, { paidAmount: 1000000, status: 'partial' });
  r = await app.call('PATCH', `/api/v1/tuitions/${ids.tu1}`, { token: tok.principal, body: { items } });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'REASON_REQUIRED');
  r = await app.call('PATCH', `/api/v1/tuitions/${ids.tu1}`, { token: tok.principal, body: { items: [{ name: 'HP', amount: 500000 }], reason: 'Giảm' } });
  assert.equal(r.status, 400, 'amount mới < paidAmount');
  r = await app.call('PATCH', `/api/v1/tuitions/${ids.tu1}`, { token: tok.principal, body: { items: [{ name: 'HP', amount: 1000000 }], reason: 'Miễn giảm tiền ăn' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.amount, 1000000);
  assert.equal(r.body.data.status, 'paid', 'computeStatus: đã thu đủ');
  await new Promise((res) => setTimeout(res, 100));
  const adj = await M.AuditLog.findOne({ action: 'ADJUST_TUITION' }).lean();
  assert.ok(adj);
  assert.equal(adj.payload.reason, 'Miễn giảm tiền ăn');
  assert.equal(adj.payload.before.amount, 2500000);
  assert.equal(adj.payload.after.amount, 1000000);
  r = await app.call('PATCH', `/api/v1/tuitions/${ids.tu1}`, { token: tok.principal, body: { note: 'ghi chú' } });
  assert.equal(r.status, 200, 'chỉ sửa note không cần lý do');
  r = await app.call('DELETE', `/api/v1/tuitions/${ids.tu1}`, { token: tok.principal });
  assert.equal(r.status, 400);
  await M.Tuition.updateOne({ _id: ids.tu1 }, { paidAmount: 0, status: 'unpaid', amount: 2500000, items: [{ name: 'Học phí', amount: 2500000 }], note: '' });
});

test('applyPayment: thiếu → partial; đủ → paid; thừa → paid + note; âm (gỡ gán) → tính lại; không âm quá; transaction', async () => {
  await M.Tuition.updateOne({ _id: ids.tu1 }, { dueDate: new Date('2099-01-01T00:00:00Z') }); // chưa quá hạn để thấy partial
  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    await svc.applyPayment(ids.tu1, 1000000, { session });
  });
  let t = await M.Tuition.findById(ids.tu1);
  assert.equal(t.status, 'partial');
  assert.equal(t.paidAmount, 1000000);

  await svc.applyPayment(ids.tu1, 1500000);
  t = await M.Tuition.findById(ids.tu1);
  assert.equal(t.status, 'paid');
  assert.equal(t.note, '');

  await svc.applyPayment(ids.tu1, 200000);
  t = await M.Tuition.findById(ids.tu1);
  assert.equal(t.status, 'paid');
  assert.match(t.note, /thừa 200\.000/);

  await svc.applyPayment(ids.tu1, -1700000); // gỡ 2 giao dịch
  t = await M.Tuition.findById(ids.tu1);
  assert.equal(t.paidAmount, 1000000);
  assert.equal(t.status, 'partial');
  await M.Tuition.updateOne({ _id: ids.tu1 }, { dueDate: new Date('2026-10-10T00:00:00Z') });
  await svc.applyPayment(ids.tu1, 0);
  t = await M.Tuition.findById(ids.tu1);
  assert.equal(t.status, 'overdue', 'cùng số tiền nhưng dueDate đã qua → computeStatus = overdue');
  await assert.rejects(() => svc.applyPayment(ids.tu1, -5000000), /không thể âm/);
  await svc.applyPayment(ids.tu1, 1700000); // trả lại như cũ
  await session.endSession();
});

test('summary tháng: tổng/đã thu/còn lại + đếm theo trạng thái; theo lớp', async () => {
  let r = await app.call('GET', '/api/v1/tuitions/summary?month=2026-10', { token: tok.principal });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.count, 3);
  assert.equal(r.body.data.totalAmount, 2500000 + 2800000 + 1500000);
  assert.equal(r.body.data.totalPaid, 2700000);
  assert.equal(r.body.data.remaining, 6800000 - 2700000);
  assert.equal(r.body.data.paid, 1);
  assert.equal(r.body.data.unpaid, 2);
  r = await app.call('GET', `/api/v1/tuitions/summary?month=2026-10&class=${ids.c2}`, { token: tok.principal });
  assert.equal(r.body.data.count, 1);
  r = await app.call('GET', '/api/v1/tuitions/summary?month=2027-01', { token: tok.principal });
  assert.equal(r.body.data.count, 0);
});

test('markOverdue: unpaid/partial quá hạn → overdue; paid giữ nguyên; sửa dueDate về tương lai → unpaid', async () => {
  const n = await svc.markOverdue(new Date('2026-10-11T00:00:00Z'));
  assert.equal(n, 2);
  const byStatus = (await M.Tuition.find().lean()).map((t) => t.status).sort();
  assert.deepEqual(byStatus, ['overdue', 'overdue', 'paid']);

  const tu2 = await M.Tuition.findOne({ student: ids.s2 });
  const r = await app.call('PATCH', `/api/v1/tuitions/${tu2.id}`, { token: tok.principal, body: { dueDate: '2099-01-01' } });
  assert.equal(r.body.data.status, 'unpaid');
});
