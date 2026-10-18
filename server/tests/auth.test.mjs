import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { setupDB, teardownDB, startApp } from './setup.mjs';

process.env.LOG_LEVEL = 'error';

let app;
let admin; // { token, cookie }

before(async () => {
  await setupDB();
  app = await startApp();
  const { User } = await import('../src/models/index.js');
  await User.create({ fullName: 'Admin', email: 'admin@kc.vn', password: '123456', role: 'admin' });
});

after(async () => {
  await app.close();
  await teardownDB();
});

const refreshCookie = (setCookie) => setCookie.split(';')[0];

test('login sai mật khẩu → 401 BAD_CREDENTIALS', async () => {
  const r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'admin@kc.vn', password: 'sai' } });
  assert.equal(r.status, 401);
  assert.equal(r.body.code, 'BAD_CREDENTIALS');
});

test('login thiếu password → 400 VALIDATION_ERROR, lỗi tiếng Việt', async () => {
  const r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'admin@kc.vn' } });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'VALIDATION_ERROR');
  assert.equal(r.body.errors[0].field, 'password');
  assert.match(r.body.errors[0].message, /không hợp lệ/i);
});

test('login đúng → accessToken + cookie httpOnly, không lộ password/refreshTokens', async () => {
  const r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'admin@kc.vn', password: '123456' } });
  assert.equal(r.status, 200);
  assert.ok(r.body.data.accessToken);
  assert.match(r.cookie, /kc_refresh=/);
  assert.match(r.cookie, /HttpOnly/);
  assert.match(r.cookie, /Path=\/api\/v1\/auth/);
  assert.match(r.cookie, /SameSite=Lax/);
  assert.equal('password' in r.body.data.user, false);
  assert.equal('refreshTokens' in r.body.data.user, false);
  admin = { token: r.body.data.accessToken, cookie: refreshCookie(r.cookie) };
});

test('GET /me không token → 401; có token → user admin', async () => {
  let r = await app.call('GET', '/api/v1/auth/me');
  assert.equal(r.status, 401);
  r = await app.call('GET', '/api/v1/auth/me', { token: admin.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.role, 'admin');
});

test('token giả → 401 TOKEN_INVALID', async () => {
  const r = await app.call('GET', '/api/v1/auth/me', { token: 'abc.def.ghi' });
  assert.equal(r.status, 401);
  assert.equal(r.body.code, 'TOKEN_INVALID');
});

test('admin register teacher → 201; trùng email → 409; dữ liệu sai → 400', async () => {
  const body = { fullName: 'Cô Lan', email: 'lan@kc.vn', phone: '0901234567', password: '123456', role: 'teacher' };
  let r = await app.call('POST', '/api/v1/auth/register', { body, token: admin.token });
  assert.equal(r.status, 201);
  r = await app.call('POST', '/api/v1/auth/register', { body, token: admin.token });
  assert.equal(r.status, 409);
  r = await app.call('POST', '/api/v1/auth/register', {
    body: { fullName: 'X', email: 'bad', password: '1', role: 'boss' },
    token: admin.token,
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.errors.length, 4);
});

test('teacher login bằng sđt → 200; teacher gọi register → 403', async () => {
  let r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: '0901234567', password: '123456' } });
  assert.equal(r.status, 200);
  r = await app.call('POST', '/api/v1/auth/register', {
    body: { fullName: 'Y', email: 'y@kc.vn', password: '123456', role: 'parent' },
    token: r.body.data.accessToken,
  });
  assert.equal(r.status, 403);
});

test('refresh xoay vòng: token cũ bị thu hồi, dùng lại → thu hồi toàn bộ', async () => {
  let r = await app.call('POST', '/api/v1/auth/refresh', { cookie: admin.cookie });
  assert.equal(r.status, 200);
  const newCookie = refreshCookie(r.cookie);
  assert.notEqual(newCookie, admin.cookie);

  r = await app.call('POST', '/api/v1/auth/refresh', { cookie: admin.cookie });
  assert.equal(r.status, 401);
  assert.equal(r.body.code, 'REFRESH_REUSED');

  // Token mới cũng bị thu hồi vì nghi ngờ đánh cắp
  r = await app.call('POST', '/api/v1/auth/refresh', { cookie: newCookie });
  assert.equal(r.status, 401);

  // Đăng nhập lại cho các test sau
  r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'admin@kc.vn', password: '123456' } });
  admin = { token: r.body.data.accessToken, cookie: refreshCookie(r.cookie) };
});

test('refresh qua body.refreshToken (không cookie) → 200', async () => {
  const token = admin.cookie.split('=')[1];
  const r = await app.call('POST', '/api/v1/auth/refresh', { body: { refreshToken: token } });
  assert.equal(r.status, 200);
  admin.cookie = refreshCookie(r.cookie);
});

test('rate-limit theo identifier: 10 lần sai → 429 LOGIN_LOCKED, tài khoản khác không ảnh hưởng', async () => {
  const { User } = await import('../src/models/index.js');
  await User.create({ fullName: 'Nạn nhân', email: 'victim@kc.vn', password: '123456', role: 'parent' });
  let last;
  for (let i = 0; i < 10; i++) {
    last = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'victim@kc.vn', password: 'sai' } });
    assert.equal(last.status, 401);
  }
  last = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'VICTIM@kc.vn', password: '123456' } });
  assert.equal(last.status, 429, 'lần thứ 11 bị khoá dù mật khẩu đúng, không phân biệt hoa thường');
  assert.equal(last.body.code, 'LOGIN_LOCKED');

  const other = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'admin@kc.vn', password: '123456' } });
  assert.equal(other.status, 200, 'tài khoản khác cùng IP vẫn đăng nhập được');
});

test('đổi mật khẩu → đăng xuất mọi thiết bị; login mật khẩu mới; logout', async () => {
  let r = await app.call('PATCH', '/api/v1/auth/me/password', {
    body: { currentPassword: '123456', newPassword: 'moi12345' },
    token: admin.token,
  });
  assert.equal(r.status, 200);

  r = await app.call('POST', '/api/v1/auth/refresh', { cookie: admin.cookie });
  assert.equal(r.status, 401, 'refresh cũ không còn dùng được');

  r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'admin@kc.vn', password: 'moi12345' } });
  assert.equal(r.status, 200);
  const c = refreshCookie(r.cookie);

  r = await app.call('POST', '/api/v1/auth/logout', { token: r.body.data.accessToken, cookie: c });
  assert.equal(r.status, 200);
  r = await app.call('POST', '/api/v1/auth/refresh', { cookie: c });
  assert.equal(r.status, 401);
});

test('tài khoản bị khoá → 403 ACCOUNT_LOCKED', async () => {
  const { User } = await import('../src/models/index.js');
  await User.updateOne({ email: 'lan@kc.vn' }, { isActive: false });
  const r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'lan@kc.vn', password: '123456' } });
  assert.equal(r.status, 403);
  assert.equal(r.body.code, 'ACCOUNT_LOCKED');
});

test('MongoDB hỗ trợ transaction (replica set)', async () => {
  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    const { User } = await import('../src/models/index.js');
    await User.create([{ fullName: 'Tx', email: 'tx@kc.vn', password: '123456', role: 'parent' }], { session });
  });
  await session.endSession();
  const { User } = await import('../src/models/index.js');
  assert.ok(await User.exists({ email: 'tx@kc.vn' }));
});

test('Swagger: /api/docs.json có paths auth, /api/docs trả 200', async () => {
  let r = await app.call('GET', '/api/docs.json');
  assert.equal(r.status, 200);
  assert.ok(r.body.paths['/auth/login']);
  r = await app.call('GET', '/api/docs/');
  assert.equal(r.status, 200);
});
