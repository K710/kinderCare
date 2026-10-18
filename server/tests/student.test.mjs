// Test 3.2: Students
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDB, teardownDB, startApp } from './setup.mjs';

process.env.LOG_LEVEL = 'error';

let app, M;
const tok = {};
const ids = {};

async function login(identifier) {
  const r = await app.call('POST', '/api/v1/auth/login', { body: { identifier, password: '123456' } });
  return r.body.data.accessToken;
}

before(async () => {
  await setupDB();
  app = await startApp();
  M = await import('../src/models/index.js');
  const mk = (fullName, email, role) => ({ fullName, email, role, password: '123456' });
  const [admin, principal, t1, t2, p1, p2] = await M.User.create([
    mk('Admin', 'admin@kc.vn', 'admin'),
    mk('HT', 'ht@kc.vn', 'principal'),
    mk('Cô Lan', 'lan@kc.vn', 'teacher'),
    mk('Cô Mai', 'mai@kc.vn', 'teacher'),
    mk('PH An', 'an@kc.vn', 'parent'),
    mk('PH Bình', 'binh@kc.vn', 'parent'),
  ]);
  Object.assign(ids, { admin: admin.id, principal: principal.id, t1: t1.id, t2: t2.id, p1: p1.id, p2: p2.id });
  const sy = await M.SchoolYear.create({ name: '2025-2026', startDate: '2025-09-01', endDate: '2026-05-31', isCurrent: true });
  const [c1, c2] = await M.Class.create([
    { name: 'Mầm 1', ageGroup: 'mam', schoolYear: sy._id, teachers: [t1._id], capacity: 2 },
    { name: 'Chồi 1', ageGroup: 'choi', schoolYear: sy._id, teachers: [t2._id] },
  ]);
  Object.assign(ids, { c1: c1.id, c2: c2.id });
  for (const [k, e] of Object.entries({ admin: 'admin@kc.vn', principal: 'ht@kc.vn', t1: 'lan@kc.vn', t2: 'mai@kc.vn', p1: 'an@kc.vn', p2: 'binh@kc.vn' })) {
    tok[k] = await login(e);
  }
});

after(async () => {
  await app.close();
  await teardownDB();
});

const body = (o) => ({ fullName: 'Bé An', dateOfBirth: '2021-05-01', gender: 'male', parents: [ids.p1], ...o });

test('tạo HS: principal 201 (có class + nhạy cảm); parent không hợp lệ 400; ngày sinh tương lai 400; teacher 403', async () => {
  let r = await app.call('POST', '/api/v1/students', {
    token: tok.principal,
    body: body({ class: ids.c1, allergies: ['Tôm'], medicalNotes: 'Hen nhẹ', emergencyContact: { name: 'Bà', phone: '0909' } }),
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.class.name, 'Mầm 1');
  assert.equal(r.body.data.class.teachers[0].fullName, 'Cô Lan');
  assert.deepEqual(r.body.data.allergies, ['Tôm']);
  ids.s1 = r.body.data._id;

  r = await app.call('POST', '/api/v1/students', { token: tok.principal, body: body({ parents: [ids.t1] }) });
  assert.equal(r.status, 400);

  r = await app.call('POST', '/api/v1/students', { token: tok.principal, body: body({ dateOfBirth: '2099-01-01' }) });
  assert.equal(r.status, 400);

  r = await app.call('POST', '/api/v1/students', { token: tok.t1, body: body() });
  assert.equal(r.status, 403);
});

test('tạo HS vào lớp đầy → 400; tạo không lớp → unassigned', async () => {
  let r = await app.call('POST', '/api/v1/students', { token: tok.admin, body: body({ fullName: 'Bé Bình', parents: [ids.p2], class: ids.c1 }) });
  assert.equal(r.status, 201);
  ids.s2 = r.body.data._id;

  r = await app.call('POST', '/api/v1/students', { token: tok.admin, body: body({ fullName: 'Bé Cúc', parents: [ids.p2], class: ids.c1 }) });
  assert.equal(r.status, 400, 'capacity 2');

  r = await app.call('POST', '/api/v1/students', { token: tok.admin, body: body({ fullName: 'Bé Cúc', parents: [ids.p1, ids.p2] }) });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.class, null);
  ids.s3 = r.body.data._id;

  r = await app.call('GET', '/api/v1/students?unassigned=true', { token: tok.principal });
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].fullName, 'Bé Cúc');
});

test('list: principal thấy 3, không lộ allergies; teacher chỉ lớp mình; teacher lọc lớp khác 403', async () => {
  let r = await app.call('GET', '/api/v1/students', { token: tok.principal });
  assert.equal(r.body.data.length, 3);
  assert.equal('allergies' in r.body.data[0], false);
  assert.equal('medicalNotes' in r.body.data[0], false);

  r = await app.call('GET', '/api/v1/students', { token: tok.t1 });
  assert.equal(r.body.data.length, 2);
  r = await app.call('GET', `/api/v1/students?class=${ids.c2}`, { token: tok.t1 });
  assert.equal(r.status, 403);
  r = await app.call('GET', '/api/v1/students', { token: tok.t2 });
  assert.equal(r.body.data.length, 0);

  r = await app.call('GET', '/api/v1/students?search=cúc', { token: tok.admin });
  assert.equal(r.body.data.length, 1);
});

test('chi tiết: PH của bé 200 kèm nhạy cảm; PH khác 403; GV lớp bé 200; GV khác 403; parent list 403', async () => {
  let r = await app.call('GET', `/api/v1/students/${ids.s1}`, { token: tok.p1 });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.allergies, ['Tôm']);
  assert.equal(r.body.data.parents[0].fullName, 'PH An');

  r = await app.call('GET', `/api/v1/students/${ids.s1}`, { token: tok.p2 });
  assert.equal(r.status, 403);
  r = await app.call('GET', `/api/v1/students/${ids.s1}`, { token: tok.t1 });
  assert.equal(r.status, 200);
  r = await app.call('GET', `/api/v1/students/${ids.s1}`, { token: tok.t2 });
  assert.equal(r.status, 403);
  r = await app.call('GET', `/api/v1/students/${ids.s3}`, { token: tok.t1 });
  assert.equal(r.status, 403, 'bé chưa xếp lớp → GV không xem được');

  r = await app.call('GET', '/api/v1/students', { token: tok.p1 });
  assert.equal(r.status, 403);
});

test('my-children và /auth/me kèm children từ Student.parents', async () => {
  let r = await app.call('GET', '/api/v1/students/my-children', { token: tok.p1 });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.map((s) => s.fullName).sort(), ['Bé An', 'Bé Cúc']);
  assert.equal(r.body.data.find((s) => s.fullName === 'Bé An').class.teachers[0].fullName, 'Cô Lan');

  r = await app.call('GET', '/api/v1/auth/me', { token: tok.p2 });
  assert.equal(r.body.data.children.length, 2);
  r = await app.call('GET', '/api/v1/auth/me', { token: tok.t1 });
  assert.equal('children' in r.body.data, false);

  r = await app.call('GET', '/api/v1/students/my-children', { token: tok.t1 });
  assert.equal(r.status, 403);
});

test('sửa hồ sơ: strict, không nhận parents/class; setParents; setStatus rời lớp', async () => {
  let r = await app.call('PATCH', `/api/v1/students/${ids.s1}`, { token: tok.principal, body: { nickname: 'Bi', parents: [ids.p2] } });
  assert.equal(r.status, 400);
  r = await app.call('PATCH', `/api/v1/students/${ids.s1}`, { token: tok.principal, body: { nickname: 'Bi', allergies: [] } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.nickname, 'Bi');
  assert.deepEqual(r.body.data.allergies, []);

  r = await app.call('PATCH', `/api/v1/students/${ids.s1}/parents`, { token: tok.principal, body: { parents: [ids.p1, ids.p2, ids.p1] } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.parents.length, 2, 'loại trùng');
  r = await app.call('GET', `/api/v1/students/${ids.s1}`, { token: tok.p2 });
  assert.equal(r.status, 200, 'p2 giờ là PH của s1');

  r = await app.call('PATCH', `/api/v1/students/${ids.s2}/status`, { token: tok.principal, body: { status: 'left' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.class, null);
  r = await app.call('GET', `/api/v1/students?class=${ids.c1}`, { token: tok.principal });
  assert.equal(r.body.data.length, 1, 'mặc định chỉ active');
  r = await app.call('GET', '/api/v1/students?status=left', { token: tok.principal });
  assert.equal(r.body.data.length, 1);
});

test('avatar: không file 400; sai định dạng 400; upload local → 200 link ký; GV lớp khác 403', async () => {
  const form = (type, name) => {
    const fd = new FormData();
    fd.append('avatar', new Blob([Buffer.from('fake')], { type }), name);
    return fd;
  };
  const send = async (id, token, fd) => {
    const r = await fetch(`${app.base}/api/v1/students/${id}/avatar`, { method: 'PATCH', headers: { authorization: `Bearer ${token}` }, body: fd });
    return { status: r.status, body: await r.json() };
  };

  let r = await send(ids.s1, tok.principal, new FormData());
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'NO_FILE');

  r = await send(ids.s1, tok.principal, form('text/plain', 'a.txt'));
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'UPLOAD_TYPE');

  r = await send(ids.s1, tok.principal, form('image/png', 'a.png'));
  assert.equal(r.status, 200);
  assert.match(r.body.data.avatar, /^\/api\/v1\/files\/local\/students\/.+\?exp=/);

  r = await send(ids.s1, tok.t2, form('image/png', 'a.png'));
  assert.equal(r.status, 403);
});
