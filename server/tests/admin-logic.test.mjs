// Test 6.1 logic: tự khoá/đổi vai trò, admin cuối, xoá năm học, mustChangePassword, chính sách mật khẩu production
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import mongoose from 'mongoose';
import { setupDB, teardownDB, startApp } from './setup.mjs';
import { seedBasic } from './fixtures.mjs';

process.env.LOG_LEVEL = 'error';
const run = promisify(execFile);
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

test('admin không tự đổi vai trò (SELF_ROLE_CHANGE), không tự khoá (SELF_LOCK); sửa tên mình vẫn được', async () => {
  let r = await app.call('PATCH', `/api/v1/users/${ids.admin}`, { token: tok.admin, body: { role: 'teacher' } });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'SELF_ROLE_CHANGE');
  r = await app.call('PATCH', `/api/v1/users/${ids.admin}/status`, { token: tok.admin, body: { isActive: false } });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'SELF_LOCK');
  r = await app.call('PATCH', `/api/v1/users/${ids.admin}`, { token: tok.admin, body: { fullName: 'Admin Tổng', role: 'admin' } });
  assert.equal(r.status, 200, 'giữ nguyên role thì không tính là đổi');
});

test('admin cuối cùng: không khoá / không hạ vai trò (LAST_ADMIN); có admin thứ 2 thì khoá được; khoá xong admin còn lại thành "cuối"', async () => {
  // Tạo admin 2 rồi đăng nhập bằng admin 2 để thao tác lên admin 1
  let r = await app.call('POST', '/api/v1/users', { token: tok.admin, body: { fullName: 'Admin 2', email: 'admin2@kc.vn', role: 'admin', password: '123456' } });
  assert.equal(r.status, 201);
  const admin2 = r.body.data._id;
  await M.User.updateOne({ _id: admin2 }, { mustChangePassword: false });
  r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'admin2@kc.vn', password: '123456' } });
  const tok2 = r.body.data.accessToken;

  // 2 admin active → admin2 khoá admin1 được
  r = await app.call('PATCH', `/api/v1/users/${ids.admin}/status`, { token: tok2, body: { isActive: false } });
  assert.equal(r.status, 200);
  // admin2 giờ là admin active cuối → admin1 (bị khoá) không thể làm gì; dùng admin2 thử hạ vai trò chính mình → SELF; mở khoá admin1 rồi để admin1 thử khoá admin2 khi admin1... (2 active) → ok
  r = await app.call('PATCH', `/api/v1/users/${ids.admin}/status`, { token: tok2, body: { isActive: true } });
  assert.equal(r.status, 200);
  // Khoá admin2 bằng admin1 → còn admin1 active → ok
  r = await app.call('PATCH', `/api/v1/users/${admin2}/status`, { token: tok.admin, body: { isActive: false } });
  assert.equal(r.status, 200);
  // Giờ admin1 là admin active cuối: admin2 (đã khoá) không gọi được; kiểm tra bằng cách hạ vai trò admin1 qua admin2 sau khi mở khoá… đơn giản hơn: mở khoá admin2, khoá admin1 bằng admin2, rồi admin2 tự hạ? → SELF. Kiểm tra LAST_ADMIN trực tiếp:
  await M.User.updateOne({ _id: admin2 }, { isActive: true });
  await M.User.updateOne({ _id: ids.admin }, { isActive: false });
  // admin2 là active duy nhất; admin1 (inactive) thử thao tác → 403 ACCOUNT_LOCKED
  r = await app.call('PATCH', `/api/v1/users/${admin2}/status`, { token: tok.admin, body: { isActive: false } });
  assert.equal(r.status, 403);
  await M.User.updateOne({ _id: ids.admin }, { isActive: true });
  await M.User.updateOne({ _id: admin2 }, { isActive: false });
  // admin1 active duy nhất, admin2 inactive: admin1 hạ vai trò admin2 (inactive) → được (không phải admin active)
  r = await app.call('PATCH', `/api/v1/users/${admin2}`, { token: tok.admin, body: { role: 'teacher' } });
  assert.equal(r.status, 200);
  // Admin cuối thử bị hạ vai trò / khoá bởi người khác: tạo admin3 active, khoá admin1 → 2 active → ok; rồi admin3 là cuối → admin1 không active nên không test được; dùng principal? không có quyền. Kiểm tra qua service trực tiếp:
  const svc = await import('../src/services/user.service.js');
  await assert.rejects(() => svc.setStatus(ids.admin, false, 'someone'), (e) => e.code === 'LAST_ADMIN');
  await assert.rejects(() => svc.update(ids.admin, { role: 'principal' }, 'someone'), (e) => e.code === 'LAST_ADMIN');
});

test('xoá năm học: còn lớp / học phí → 400 SCHOOL_YEAR_IN_USE kèm số lượng; năm hiện tại → 400; năm trống → 200', async () => {
  // sy (fixtures) là hiện tại và có 2 lớp
  let r = await app.call('DELETE', `/api/v1/school-years/${ids.sy}`, { token: tok.admin });
  assert.equal(r.status, 400);
  assert.match(r.body.message, /năm học hiện tại/i);

  r = await app.call('POST', '/api/v1/school-years', { token: tok.admin, body: { name: '2024-2025', startDate: '2024-09-01', endDate: '2025-05-31' } });
  const old = r.body.data._id;
  await M.Class.create({ name: 'Lá cũ', ageGroup: 'la', schoolYear: old });
  await M.Tuition.create({ student: ids.s1, class: ids.c1, schoolYear: old, month: '2025-03', items: [{ name: 'HP', amount: 1 }], amount: 1, dueDate: new Date(), paymentCode: 'HPAAAABBBB' });
  r = await app.call('DELETE', `/api/v1/school-years/${old}`, { token: tok.admin });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'SCHOOL_YEAR_IN_USE');
  assert.match(r.body.message, /1 lớp và 1 bản ghi học phí/);

  await M.Class.deleteMany({ schoolYear: old });
  await M.Tuition.deleteMany({ schoolYear: old });
  r = await app.call('DELETE', `/api/v1/school-years/${old}`, { token: tok.admin });
  assert.equal(r.status, 200);
});

test('mustChangePassword: tạo không mật khẩu → tempPassword trả 1 lần; đăng nhập → chỉ /auth/* được; đổi mật khẩu xong vào app bình thường; reset → bật lại', async () => {
  let r = await app.call('POST', '/api/v1/users', { token: tok.admin, body: { fullName: 'Cô Hoa', email: 'hoa@kc.vn', role: 'teacher' } });
  assert.equal(r.status, 201);
  const temp = r.body.data.tempPassword;
  assert.match(temp, /^[A-Za-z0-9]{8}$/);
  assert.equal(r.body.data.mustChangePassword, true);
  const id = r.body.data._id;
  r = await app.call('GET', `/api/v1/users/${id}`, { token: tok.admin });
  assert.equal('tempPassword' in r.body.data, false, 'không trả lại lần 2');
  assert.equal(r.body.data.mustChangePassword, true);

  r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'hoa@kc.vn', password: temp } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.user.mustChangePassword, true);
  const t = r.body.data.accessToken;

  r = await app.call('GET', '/api/v1/classes', { token: t });
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'PASSWORD_CHANGE_REQUIRED');
  r = await app.call('GET', '/api/v1/dashboard/teacher', { token: t });
  assert.equal(r.status, 403);
  r = await app.call('GET', '/api/v1/auth/me', { token: t });
  assert.equal(r.status, 200);

  r = await app.call('PATCH', '/api/v1/auth/me/password', { token: t, body: { currentPassword: temp, newPassword: temp } });
  assert.equal(r.status, 400, 'mật khẩu mới phải khác');
  r = await app.call('PATCH', '/api/v1/auth/me/password', { token: t, body: { currentPassword: temp, newPassword: 'moi12345' } });
  assert.equal(r.status, 200);
  r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'hoa@kc.vn', password: 'moi12345' } });
  assert.equal(r.body.data.user.mustChangePassword, false);
  r = await app.call('GET', '/api/v1/classes', { token: r.body.data.accessToken });
  assert.equal(r.status, 200);

  // Admin đặt lại (không truyền) → sinh tạm, bật lại cờ
  r = await app.call('POST', `/api/v1/users/${id}/reset-password`, { token: tok.admin });
  assert.equal(r.status, 200);
  assert.match(r.body.data.tempPassword, /^[A-Za-z0-9]{8}$/);
  r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'hoa@kc.vn', password: r.body.data.tempPassword } });
  assert.equal(r.body.data.user.mustChangePassword, true);
  r = await app.call('GET', '/api/v1/classes', { token: r.body.data.accessToken });
  assert.equal(r.status, 403);
  // Admin đặt lại có truyền mật khẩu → vẫn bật cờ
  r = await app.call('POST', `/api/v1/users/${id}/reset-password`, { token: tok.admin, body: { newPassword: 'abcdef' } });
  assert.equal(r.body.data.tempPassword, 'abcdef');
  assert.equal((await M.User.findById(id)).mustChangePassword, true);
});

test('create-admin: production từ chối mật khẩu < 8 ký tự, nhận ≥ 8; dev nhận 6', async () => {
  const env = { ...process.env, NODE_ENV: 'production', MONGO_URI: mongoose.connection.client.s.url, LOG_LEVEL: 'error', COOKIE_SAMESITE: 'lax', COOKIE_SECURE: 'false' };
  const script = 'src/scripts/create-admin.js';
  const cwd = process.cwd();

  const short = await run('node', [script, '--email', 'prod@kc.vn', '--name', 'Prod', '--password', '1234567'], { cwd, env }).catch((e) => e);
  assert.equal(short.code, 1);
  assert.match(short.stderr + short.stdout, /tối thiểu 8 ký tự/);
  assert.equal(await M.User.exists({ email: 'prod@kc.vn' }), null);

  const ok = await run('node', [script, '--email', 'prod@kc.vn', '--name', 'Prod', '--password', '12345678'], { cwd, env });
  assert.match(ok.stdout, /Đã tạo admin/);
  assert.ok(await M.User.exists({ email: 'prod@kc.vn', role: 'admin' }));

  const dev = await run('node', [script, '--email', 'dev@kc.vn', '--name', 'Dev', '--password', '123456'], { cwd, env: { ...env, NODE_ENV: 'development' } });
  assert.match(dev.stdout, /Đã tạo admin/);
});
