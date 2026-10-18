// Test: hồ sơ PH (children từ Student.parents) ở login/refresh/me; phiên cũ sau khi seed lại
process.env.LOG_LEVEL = 'error';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDB, teardownDB, startApp } from './setup.mjs';
import { seedBasic } from './fixtures.mjs';

let app, M, ids, tok;
const refreshCookie = (setCookie) => (setCookie || '').split(';')[0];

before(async () => {
  await setupDB();
  app = await startApp();
  ({ M, ids, tok } = await seedBasic(app));
});
after(async () => {
  await app.close();
  await teardownDB();
});

test('PH đăng nhập → user.children đúng số con, có ở cả login / refresh / me; PH 2 con xem được từng bé', async () => {
  // p1 có 2 con: s1 (lớp c1) và s3 (lớp c2); p2 có 1 con: s3
  let r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'an@kc.vn', password: '123456' } });
  assert.equal(r.status, 200);
  const kids = r.body.data.user.children;
  assert.equal(kids.length, 2, 'login phải trả 2 con');
  assert.deepEqual(kids.map((k) => k._id).sort(), [ids.s1, ids.s3].sort());
  assert.ok(kids.every((k) => k.class?.name && k.dateOfBirth && k.gender), 'mỗi bé có lớp, ngày sinh, giới tính để client chọn bé');
  const cookie = refreshCookie(r.cookie);

  r = await app.call('POST', '/api/v1/auth/refresh', { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.user.children.length, 2, 'refresh (bootstrap client) cũng phải trả children');

  r = await app.call('GET', '/api/v1/auth/me', { token: r.body.data.accessToken });
  assert.equal(r.body.data.children.length, 2);

  // Đổi bé: dữ liệu theo từng con đều truy cập được
  for (const k of kids) {
    const d = await app.call('GET', `/api/v1/students/${k._id}`, { token: tok.p1 });
    assert.equal(d.status, 200, `PH xem được bé ${k.fullName}`);
    const a = await app.call('GET', `/api/v1/attendance/student/${k._id}`, { token: tok.p1 });
    assert.equal(a.status, 200);
  }
  // p2 có 2 con (s2, s3); bé đã nghỉ học không hiện
  r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'binh@kc.vn', password: '123456' } });
  assert.equal(r.body.data.user.children.length, 2);
  await M.Student.updateOne({ _id: ids.s3 }, { status: 'left' });
  r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'binh@kc.vn', password: '123456' } });
  assert.deepEqual(r.body.data.user.children.map((k) => k._id), [ids.s2]);
  await M.Student.updateOne({ _id: ids.s3 }, { status: 'active' });
  // GV / admin không có trường children
  r = await app.call('GET', '/api/v1/auth/me', { token: tok.t1 });
  assert.equal('children' in r.body.data, false);
});

test('phiên cũ sau khi seed lại (user không còn) → access 401 USER_NOT_FOUND, refresh 401', async () => {
  const ghost = await M.User.create({ fullName: 'Tạm', email: 'ghost@kc.vn', role: 'parent', password: '123456' });
  let r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'ghost@kc.vn', password: '123456' } });
  const token = r.body.data.accessToken;
  const cookie = refreshCookie(r.cookie);
  await M.User.deleteOne({ _id: ghost._id }); // seed xoá DB
  r = await app.call('GET', '/api/v1/dashboard/parent', { token });
  assert.equal(r.status, 401);
  assert.equal(r.body.code, 'USER_NOT_FOUND');
  r = await app.call('POST', '/api/v1/auth/refresh', { cookie });
  assert.equal(r.status, 401);
});
