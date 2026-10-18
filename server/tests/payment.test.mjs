// Test GĐ4: Payment, webhook SePay, QR/status, đối soát
process.env.SEPAY_WEBHOOK_KEY = 'test-webhook-key';
process.env.SEPAY_ACCOUNT = '0123456789';
process.env.SEPAY_BANK = 'MBBank';
process.env.SEPAY_ACCOUNT_NAME = 'TRUONG MAM NON KINDERCARE';
process.env.LOG_LEVEL = 'error';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDB, teardownDB, startApp } from './setup.mjs';
import { seedBasic } from './fixtures.mjs';

let app, M, ids, tok;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let seq = 1000;
const hook = (over = {}, key = 'test-webhook-key') =>
  app.call('POST', '/api/v1/payments/sepay-webhook', {
    headers: key ? { authorization: `Apikey ${key}` } : {},
    body: {
      id: seq++, gateway: 'MBBank', transactionDate: '2026-10-18 10:08:33', accountNumber: '0123456789', subAccount: null,
      code: null, content: '', transferType: 'in', description: '', transferAmount: 1000000, accumulated: 0, referenceCode: 'FT123', ...over,
    },
  });

before(async () => {
  await setupDB();
  app = await startApp();
  ({ M, ids, tok } = await seedBasic(app));
  // Học phí tháng 10 cho s1 (PH p1) và s2 (PH p2)
  const mk = async (student) => {
    const r = await app.call('POST', '/api/v1/tuitions', {
      token: tok.principal, body: { student, month: '2026-10', items: [{ name: 'Học phí', amount: 2500000 }], dueDate: '2099-01-01' },
    });
    return r.body.data;
  };
  const t1 = await mk(ids.s1);
  const t2 = await mk(ids.s2);
  Object.assign(ids, { tu1: t1._id, code1: t1.paymentCode, tu2: t2._id, code2: t2.paymentCode });
});
after(async () => {
  await app.close();
  await teardownDB();
});

/* ---------- Webhook ---------- */
test('webhook auth: thiếu/sai Apikey → 401 và vẫn ghi AuditLog; đúng key → 200', async () => {
  let r = await hook({}, null);
  assert.equal(r.status, 401);
  r = await hook({}, 'sai');
  assert.equal(r.status, 401);
  assert.equal(r.body.code, 'WEBHOOK_UNAUTHORIZED');
  r = await hook({ transferType: 'out' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { success: true });
  await wait(150);
  const logs = await M.AuditLog.find({ action: 'SEPAY_WEBHOOK' }).lean();
  assert.equal(logs.length, 3, '2 lần 401 + 1 lần 200 đều được ghi');
  assert.equal(logs.filter((l) => l.statusCode === 401).length, 2);
  assert.equal(logs.find((l) => l.statusCode === 401).payload.result.reason, 'unauthorized');
  assert.equal(await M.Payment.countDocuments(), 0, 'tiền ra không lưu');
});

test('webhook khớp mã: content chuẩn hoá (thường, khoảng trắng, gạch) → Payment matched + Tuition partial → paid; PH nhận thông báo', async () => {
  const codeMessy = `${ids.code1.slice(0, 4).toLowerCase()} ${ids.code1.slice(4, 8)}-${ids.code1.slice(8)}`;
  let r = await hook({ content: `CK hoc phi ${codeMessy} thang 10`, transferAmount: 1000000 });
  assert.equal(r.status, 200);
  let p = await M.Payment.findOne({ sepayId: seq - 1 });
  assert.equal(p.status, 'matched');
  assert.equal(p.paymentCode, ids.code1);
  assert.equal(p.tuition.toString(), ids.tu1);
  assert.equal(p.rawPayload.transferAmount, 1000000, 'rawPayload lưu nguyên body');
  assert.equal(p.transactionDate.toISOString(), '2026-10-18T03:08:33.000Z', 'giờ VN → UTC');
  let t = await M.Tuition.findById(ids.tu1);
  assert.equal(t.paidAmount, 1000000);
  assert.equal(t.status, 'partial');

  r = await hook({ content: `${ids.code1}`, transferAmount: 1500000 });
  t = await M.Tuition.findById(ids.tu1);
  assert.equal(t.status, 'paid');
  assert.equal(t.paidAmount, 2500000);

  await wait(150);
  r = await app.call('GET', '/api/v1/notifications?unread=true', { token: tok.p1 });
  const pays = r.body.data.filter((n) => n.type === 'payment');
  assert.equal(pays.length, 2);
  assert.match(pays[0].body, /Bé An/);
});

test('webhook chống trùng: cùng id gửi lại → 200, không cộng tiền thêm', async () => {
  const id = seq - 1;
  const before = (await M.Tuition.findById(ids.tu1)).paidAmount;
  const r = await hook({ id, content: ids.code1, transferAmount: 1500000 });
  assert.equal(r.status, 200);
  assert.equal((await M.Tuition.findById(ids.tu1)).paidAmount, before);
  assert.equal(await M.Payment.countDocuments({ sepayId: id }), 1);
});

test('webhook unmatched: không mã / 2 mã / mã không tồn tại → lưu unmatched kèm ghi chú; dùng field code khi content trống', async () => {
  let r = await hook({ content: 'chuyen tien hoc phi' });
  let p = await M.Payment.findOne({ sepayId: seq - 1 });
  assert.equal(p.status, 'unmatched');
  assert.equal(p.note, 'Không tìm thấy mã HP');

  r = await hook({ content: `${ids.code1} ${ids.code2}` });
  p = await M.Payment.findOne({ sepayId: seq - 1 });
  assert.equal(p.status, 'unmatched');
  assert.equal(p.note, 'Nội dung chứa nhiều mã HP');
  assert.equal((await M.Tuition.findById(ids.tu2)).paidAmount, 0, 'không cộng cho mã nào');

  r = await hook({ content: 'HPZZZZZZZZ' });
  p = await M.Payment.findOne({ sepayId: seq - 1 });
  assert.equal(p.status, 'unmatched');
  assert.equal(p.paymentCode, 'HPZZZZZZZZ');
  assert.equal(p.note, 'Mã HP không tồn tại');

  r = await hook({ content: '', code: ids.code2, transferAmount: 500000 });
  p = await M.Payment.findOne({ sepayId: seq - 1 });
  assert.equal(p.status, 'matched', 'fallback field code của SePay');
  assert.equal((await M.Tuition.findById(ids.tu2)).paidAmount, 500000);

  r = await hook({ transferAmount: 'abc' });
  assert.equal(r.status, 400, 'payload sai định dạng');
  r = await hook({ transferAmount: 0, content: ids.code2 });
  assert.equal(r.status, 200, 'số tiền 0 → bỏ qua');
});

test('webhook lỗi DB khi lưu Payment → 5xx (SePay retry), không mất dữ liệu; lần retry sau thành công', async () => {
  const origCreate = M.Payment.create;
  M.Payment.create = async () => {
    const e = new Error('MongoNetworkError giả lập');
    e.name = 'MongoNetworkError';
    throw e;
  };
  const before = await M.Payment.countDocuments();
  const id = seq;
  let r;
  try {
    r = await hook({ content: ids.code2, transferAmount: 100000 });
  } finally {
    M.Payment.create = origCreate;
  }
  assert.equal(r.status, 500);
  assert.equal(r.body.success, false);
  assert.equal(await M.Payment.countDocuments(), before);
  assert.equal((await M.Tuition.findById(ids.tu2)).paidAmount, 500000, 'không cộng tiền');
  await wait(150);
  const log = await M.AuditLog.findOne({ action: 'SEPAY_WEBHOOK', statusCode: 500 }).lean();
  assert.equal(log.payload.result.reason, 'db_error');

  // SePay gửi lại cùng id → lưu và khớp bình thường
  r = await hook({ id, content: ids.code2, transferAmount: 100000 });
  assert.equal(r.status, 200);
  const p = await M.Payment.findOne({ sepayId: id });
  assert.equal(p.status, 'matched');
  assert.equal((await M.Tuition.findById(ids.tu2)).paidAmount, 600000);
});

test('webhook lỗi SAU khi lưu Payment (khớp thất bại) → vẫn 200, Payment unmatched kèm ghi chú đối soát, tiền không cộng', async () => {
  const origUpdate = M.Payment.updateOne.bind(M.Payment);
  M.Payment.updateOne = function (filter, update, opts) {
    if (opts?.session && update?.$set?.status === 'matched') throw new Error('Mất kết nối giữa chừng');
    return origUpdate(filter, update, opts);
  };
  const before = (await M.Tuition.findById(ids.tu2)).paidAmount;
  let r;
  try {
    r = await hook({ content: ids.code2, transferAmount: 70000 });
  } finally {
    M.Payment.updateOne = origUpdate;
  }
  assert.equal(r.status, 200);
  const p = await M.Payment.findOne({ sepayId: seq - 1 });
  assert.equal(p.status, 'unmatched');
  assert.equal(p.paymentCode, ids.code2);
  assert.match(p.note, /Lỗi khớp tự động/);
  assert.equal((await M.Tuition.findById(ids.tu2)).paidAmount, before, 'transaction rollback');
});

/* ---------- Status / QR ---------- */
test('status theo mã: PH của bé 200 với isPaid/remaining/lastPayment; PH khác 403; mã sai định dạng 400; không tồn tại 404', async () => {
  let r = await app.call('GET', `/api/v1/payments/status/${ids.code1}`, { token: tok.p1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.isPaid, true);
  assert.equal(r.body.data.remaining, 0);
  assert.equal(r.body.data.lastPayment.amount, 1500000);
  r = await app.call('GET', `/api/v1/payments/status/${ids.code2}`, { token: tok.p2 });
  assert.equal(r.body.data.isPaid, false);
  assert.equal(r.body.data.remaining, 1900000);
  r = await app.call('GET', `/api/v1/payments/status/${ids.code1}`, { token: tok.p2 });
  assert.equal(r.status, 403);
  r = await app.call('GET', `/api/v1/payments/status/${ids.code1}`, { token: tok.principal });
  assert.equal(r.status, 200);
  r = await app.call('GET', `/api/v1/payments/status/abc`, { token: tok.p1 });
  assert.equal(r.status, 400);
  r = await app.call('GET', `/api/v1/payments/status/HPZZZZZZZZ`, { token: tok.p1 });
  assert.equal(r.status, 404);
  r = await app.call('GET', `/api/v1/payments/status/${ids.code1}`, { token: tok.t1 });
  assert.equal(r.status, 403);
});

test('QR: PH của bé nhận qrUrl đúng tham số, amount = còn lại, có hướng dẫn "mỗi bé"; PH khác 403', async () => {
  let r = await app.call('GET', `/api/v1/payments/qr/${ids.tu2}`, { token: tok.p2 });
  assert.equal(r.status, 200);
  const u = new URL(r.body.data.qrUrl);
  assert.equal(u.origin + u.pathname, 'https://qr.sepay.vn/img');
  assert.equal(u.searchParams.get('acc'), '0123456789');
  assert.equal(u.searchParams.get('bank'), 'MBBank');
  assert.equal(u.searchParams.get('amount'), '1900000');
  assert.equal(u.searchParams.get('des'), ids.code2);
  assert.equal(r.body.data.accountName, 'TRUONG MAM NON KINDERCARE');
  assert.match(r.body.data.instruction, /Mỗi bé chuyển khoản riêng/);
  r = await app.call('GET', `/api/v1/payments/qr/${ids.tu2}`, { token: tok.p1 });
  assert.equal(r.status, 403);
});

/* ---------- Đối soát ---------- */
test('list/unmatched (P); PH 403; chi tiết kèm rawPayload; list không kèm rawPayload', async () => {
  let r = await app.call('GET', '/api/v1/payments', { token: tok.principal });
  assert.equal(r.status, 200);
  assert.ok(r.body.pagination.total >= 6);
  assert.equal('rawPayload' in r.body.data[0], false);
  r = await app.call('GET', '/api/v1/payments/unmatched', { token: tok.principal });
  assert.equal(r.body.data.length, 4);
  assert.ok(r.body.data.every((p) => p.status === 'unmatched'));
  ids.unmatched = r.body.data.find((p) => p.note === 'Không tìm thấy mã HP')._id;
  r = await app.call('GET', `/api/v1/payments/${ids.unmatched}`, { token: tok.principal });
  assert.ok(r.body.data.rawPayload);
  r = await app.call('GET', `/api/v1/payments?search=${ids.code1}`, { token: tok.principal });
  assert.ok(r.body.data.length >= 2);
  r = await app.call('GET', '/api/v1/payments', { token: tok.p1 });
  assert.equal(r.status, 403);
});

test('gán tay: unmatched → manual, Tuition cộng tiền, AuditLog ASSIGN_PAYMENT, PH nhận thông báo; gán lại → 400; admin 403', async () => {
  let r = await app.call('PATCH', `/api/v1/payments/${ids.unmatched}/assign`, { token: tok.admin, body: { tuitionId: ids.tu2 } });
  assert.equal(r.status, 403);
  r = await app.call('PATCH', `/api/v1/payments/${ids.unmatched}/assign`, { token: tok.principal, body: { tuitionId: ids.tu2, note: 'PH xác nhận qua điện thoại' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.status, 'manual');
  assert.equal(r.body.data.tuition._id, ids.tu2);
  assert.equal(r.body.data.paymentCode, ids.code2);
  assert.equal(r.body.data.assignedBy.fullName, 'Hiệu trưởng');
  let t = await M.Tuition.findById(ids.tu2);
  assert.equal(t.paidAmount, 1600000);
  assert.equal(t.status, 'partial');
  await wait(150);
  assert.ok(await M.AuditLog.exists({ action: 'ASSIGN_PAYMENT' }));
  r = await app.call('GET', '/api/v1/notifications?unread=true', { token: tok.p2 });
  assert.ok(r.body.data.some((n) => n.type === 'payment' && /thủ công/.test(n.body)));
  r = await app.call('PATCH', `/api/v1/payments/${ids.unmatched}/assign`, { token: tok.principal, body: { tuitionId: ids.tu1 } });
  assert.equal(r.status, 400);
});

test('gỡ gán: thiếu lý do 400; có lý do → về unmatched, Tuition trừ tiền qua applyPayment, AuditLog UNASSIGN_PAYMENT có reason, PH được báo', async () => {
  let r = await app.call('PATCH', `/api/v1/payments/${ids.unmatched}/unassign`, { token: tok.principal, body: {} });
  assert.equal(r.status, 400);
  r = await app.call('PATCH', `/api/v1/payments/${ids.unmatched}/unassign`, { token: tok.principal, body: { reason: 'Gán nhầm bé' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.status, 'unmatched');
  assert.equal(r.body.data.tuition, null);
  assert.match(r.body.data.note, /Gỡ gán: Gán nhầm bé/);
  const t = await M.Tuition.findById(ids.tu2);
  assert.equal(t.paidAmount, 600000);
  assert.equal(t.status, 'partial');
  await wait(150);
  const log = await M.AuditLog.findOne({ action: 'UNASSIGN_PAYMENT' }).lean();
  assert.equal(log.payload.reason, 'Gán nhầm bé');
  assert.equal(log.payload.before.tuition.toString(), ids.tu2);
  r = await app.call('GET', '/api/v1/notifications?unread=true', { token: tok.p2 });
  assert.ok(r.body.data.some((n) => /gỡ khỏi hồ sơ/.test(n.body)));

  // gỡ gán các giao dịch webhook đã matched cũng được
  const matchedList = await M.Payment.find({ status: 'matched', tuition: ids.tu2 });
  assert.equal(matchedList.length, 2);
  for (const m of matchedList) {
    r = await app.call('PATCH', `/api/v1/payments/${m.id}/unassign`, { token: tok.principal, body: { reason: 'PH chuyển nhầm' } });
    assert.equal(r.status, 200);
  }
  assert.equal((await M.Tuition.findById(ids.tu2)).paidAmount, 0);
  assert.equal((await M.Tuition.findById(ids.tu2)).status, 'unpaid');
  r = await app.call('PATCH', `/api/v1/payments/${matchedList[0].id}/unassign`, { token: tok.principal, body: { reason: 'lần nữa' } });
  assert.equal(r.status, 400, 'đã unmatched');
});

test('tiền mặt: ghi nhận → Payment cash/manual + Tuition; xoá cần lý do, hoàn tiền; không gỡ gán tiền mặt', async () => {
  let r = await app.call('POST', '/api/v1/payments/manual', { token: tok.principal, body: { tuitionId: ids.tu2, amount: 2500000, note: 'Nộp tại văn phòng' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.method, 'cash');
  assert.equal(r.body.data.status, 'manual');
  assert.equal((await M.Tuition.findById(ids.tu2)).status, 'paid');
  const cashId = r.body.data._id;
  r = await app.call('POST', '/api/v1/payments/manual', { token: tok.principal, body: { tuitionId: ids.tu2, amount: -5 } });
  assert.equal(r.status, 400);

  r = await app.call('PATCH', `/api/v1/payments/${cashId}/unassign`, { token: tok.principal, body: { reason: 'thử' } });
  assert.equal(r.status, 400);
  r = await app.call('DELETE', `/api/v1/payments/${cashId}`, { token: tok.principal, body: {} });
  assert.equal(r.status, 400);
  r = await app.call('DELETE', `/api/v1/payments/${cashId}`, { token: tok.principal, body: { reason: 'Ghi nhầm' } });
  assert.equal(r.status, 200);
  assert.equal(await M.Payment.exists({ _id: cashId }), null);
  assert.equal((await M.Tuition.findById(ids.tu2)).paidAmount, 0);
  await wait(150);
  assert.ok(await M.AuditLog.exists({ action: 'DELETE_CASH_PAYMENT' }));
});

test('tiền mặt: nhiều giao dịch không có sepayId vẫn lưu được (index unique chỉ áp cho số)', async () => {
  const a = await app.call('POST', '/api/v1/payments/manual', { token: tok.principal, body: { tuitionId: ids.tu2, amount: 100000 } });
  const b = await app.call('POST', '/api/v1/payments/manual', { token: tok.principal, body: { tuitionId: ids.tu2, amount: 200000 } });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.ok((await M.Payment.countDocuments({ method: 'cash', tuition: ids.tu2 })) >= 2);
  // trùng sepayId số vẫn bị chặn
  await assert.rejects(M.Payment.create({ sepayId: 777001, amount: 1, tuition: ids.tu2 }).then(() => M.Payment.create({ sepayId: 777001, amount: 1, tuition: ids.tu2 })), /E11000|duplicate/);
});
