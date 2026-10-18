// Test 3.1: Users, SchoolYears, Classes
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDB, teardownDB, startApp } from './setup.mjs';

process.env.LOG_LEVEL = 'error';

let app, M;
const tok = {}; // token theo role
const ids = {};

async function login(identifier) {
  const r = await app.call('POST', '/api/v1/auth/login', { body: { identifier, password: '123456' } });
  return r.body.data.accessToken;
}

before(async () => {
  await setupDB();
  app = await startApp();
  M = await import('../src/models/index.js');
  const mk = (fullName, email, role, phone) => ({ fullName, email, role, phone, password: '123456' });
  const [admin, principal, t1, t2, p1, p2] = await M.User.create([
    mk('Admin', 'admin@kc.vn', 'admin'),
    mk('Hiệu trưởng', 'ht@kc.vn', 'principal'),
    mk('Cô Lan', 'lan@kc.vn', 'teacher', '0901000001'),
    mk('Cô Mai', 'mai@kc.vn', 'teacher', '0901000002'),
    mk('PH An', 'an@kc.vn', 'parent', '0902000001'),
    mk('PH Bình', 'binh@kc.vn', 'parent', '0902000002'),
  ]);
  Object.assign(ids, { admin: admin.id, principal: principal.id, t1: t1.id, t2: t2.id, p1: p1.id, p2: p2.id });
  tok.admin = await login('admin@kc.vn');
  tok.principal = await login('ht@kc.vn');
  tok.t1 = await login('lan@kc.vn');
  tok.t2 = await login('mai@kc.vn');
  tok.p1 = await login('an@kc.vn');
  tok.p2 = await login('binh@kc.vn');
});

after(async () => {
  await app.close();
  await teardownDB();
});

/* ---------- Users ---------- */
test('users: principal xem list + filter role; teacher bị 403', async () => {
  let r = await app.call('GET', '/api/v1/users?role=teacher', { token: tok.principal });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.length, 2);
  assert.equal(r.body.pagination.total, 2);
  r = await app.call('GET', '/api/v1/users', { token: tok.t1 });
  assert.equal(r.status, 403);
});

test('users: search theo tên/sđt, phân trang', async () => {
  let r = await app.call('GET', '/api/v1/users?search=0902&limit=1', { token: tok.admin });
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.pagination.total, 2);
  assert.equal(r.body.pagination.totalPages, 2);
});

test('users: admin tạo/sửa; principal tạo → 403; trùng sđt → 409', async () => {
  let r = await app.call('POST', '/api/v1/users', {
    token: tok.admin,
    body: { fullName: 'PH Cúc', email: 'cuc@kc.vn', phone: '0902000003', password: '123456', role: 'parent' },
  });
  assert.equal(r.status, 201);
  ids.p3 = r.body.data._id;

  r = await app.call('POST', '/api/v1/users', {
    token: tok.principal,
    body: { fullName: 'X', email: 'x@kc.vn', password: '123456', role: 'parent' },
  });
  assert.equal(r.status, 403);

  r = await app.call('PATCH', `/api/v1/users/${ids.p3}`, { token: tok.admin, body: { phone: '0902000001' } });
  assert.equal(r.status, 409);

  r = await app.call('PATCH', `/api/v1/users/${ids.p3}`, { token: tok.admin, body: { fullName: 'PH Cúc Mới', foo: 1 } });
  assert.equal(r.status, 400, 'strict: không nhận trường lạ');

  r = await app.call('PATCH', `/api/v1/users/${ids.p3}`, { token: tok.admin, body: { fullName: 'PH Cúc Mới' } });
  assert.equal(r.body.data.fullName, 'PH Cúc Mới');
});

test('users: khoá tài khoản → không login được; không tự khoá mình; reset password', async () => {
  let r = await app.call('PATCH', `/api/v1/users/${ids.p3}/status`, { token: tok.admin, body: { isActive: false } });
  assert.equal(r.status, 200);
  r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'cuc@kc.vn', password: '123456' } });
  assert.equal(r.status, 403);

  r = await app.call('PATCH', `/api/v1/users/${ids.admin}/status`, { token: tok.admin, body: { isActive: false } });
  assert.equal(r.status, 400);

  await app.call('PATCH', `/api/v1/users/${ids.p3}/status`, { token: tok.admin, body: { isActive: true } });
  r = await app.call('POST', `/api/v1/users/${ids.p3}/reset-password`, { token: tok.admin, body: { newPassword: 'abcdef' } });
  assert.equal(r.status, 200);
  r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'cuc@kc.vn', password: 'abcdef' } });
  assert.equal(r.status, 200);
});

test('users: id sai định dạng → 400; id không tồn tại → 404', async () => {
  let r = await app.call('GET', '/api/v1/users/abc', { token: tok.admin });
  assert.equal(r.status, 400);
  r = await app.call('GET', '/api/v1/users/64b000000000000000000000', { token: tok.admin });
  assert.equal(r.status, 404);
});

/* ---------- SchoolYears ---------- */
test('school-years: admin tạo 2 năm, isCurrent chỉ 1; endDate<=startDate → 400; trùng tên → 409', async () => {
  let r = await app.call('POST', '/api/v1/school-years', {
    token: tok.admin,
    body: { name: '2024-2025', startDate: '2024-09-01', endDate: '2025-05-31', isCurrent: true },
  });
  assert.equal(r.status, 201);
  ids.sy1 = r.body.data._id;

  r = await app.call('POST', '/api/v1/school-years', {
    token: tok.admin,
    body: { name: '2025-2026', startDate: '2025-09-01', endDate: '2026-05-31', isCurrent: true, tuitionDefault: 2500000 },
  });
  assert.equal(r.status, 201);
  ids.sy2 = r.body.data._id;

  const current = await M.SchoolYear.find({ isCurrent: true });
  assert.equal(current.length, 1);
  assert.equal(current[0].name, '2025-2026');

  r = await app.call('POST', '/api/v1/school-years', {
    token: tok.admin,
    body: { name: '2026-2027', startDate: '2026-09-01', endDate: '2026-05-31' },
  });
  assert.equal(r.status, 400);

  r = await app.call('POST', '/api/v1/school-years', {
    token: tok.admin,
    body: { name: '2025-2026', startDate: '2025-09-01', endDate: '2026-05-31' },
  });
  assert.equal(r.status, 409);
});

test('school-years: /current cho mọi role; set-current chuyển đổi; principal tạo → 403', async () => {
  let r = await app.call('GET', '/api/v1/school-years/current', { token: tok.p1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.name, '2025-2026');

  r = await app.call('PATCH', `/api/v1/school-years/${ids.sy1}/set-current`, { token: tok.admin });
  assert.equal(r.status, 200);
  r = await app.call('GET', '/api/v1/school-years/current', { token: tok.t1 });
  assert.equal(r.body.data.name, '2024-2025');
  // trả lại
  await app.call('PATCH', `/api/v1/school-years/${ids.sy2}/set-current`, { token: tok.admin });

  r = await app.call('POST', '/api/v1/school-years', {
    token: tok.principal,
    body: { name: '2027-2028', startDate: '2027-09-01', endDate: '2028-05-31' },
  });
  assert.equal(r.status, 403);
});

/* ---------- Classes ---------- */
test('classes: principal tạo lớp với GV; GV không hợp lệ → 400; trùng tên cùng năm → 409', async () => {
  let r = await app.call('POST', '/api/v1/classes', {
    token: tok.principal,
    body: { name: 'Mầm 1', ageGroup: 'mam', schoolYear: ids.sy2, teachers: [ids.t1], capacity: 3 },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.teachers[0].fullName, 'Cô Lan');
  assert.equal(r.body.data.studentCount, 0);
  ids.c1 = r.body.data._id;

  r = await app.call('POST', '/api/v1/classes', {
    token: tok.principal,
    body: { name: 'Chồi 1', ageGroup: 'choi', schoolYear: ids.sy2, teachers: [ids.t2] },
  });
  ids.c2 = r.body.data._id;

  r = await app.call('POST', '/api/v1/classes', {
    token: tok.principal,
    body: { name: 'Lá 1', ageGroup: 'la', schoolYear: ids.sy2, teachers: [ids.p1] },
  });
  assert.equal(r.status, 400, 'parent không thể làm giáo viên');

  r = await app.call('POST', '/api/v1/classes', {
    token: tok.principal,
    body: { name: 'Mầm 1', ageGroup: 'mam', schoolYear: ids.sy2 },
  });
  assert.equal(r.status, 409);

  r = await app.call('POST', '/api/v1/classes', {
    token: tok.principal,
    body: { name: 'Mầm 1', ageGroup: 'mam', schoolYear: ids.sy1 },
  });
  assert.equal(r.status, 201, 'cùng tên nhưng khác năm học thì được');
  ids.c1old = r.body.data._id;
});

test('classes: list – principal thấy tất cả, teacher chỉ lớp mình, parent 403', async () => {
  let r = await app.call('GET', `/api/v1/classes?schoolYear=${ids.sy2}`, { token: tok.principal });
  assert.equal(r.body.data.length, 2);

  r = await app.call('GET', '/api/v1/classes', { token: tok.t1 });
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].name, 'Mầm 1');

  r = await app.call('GET', '/api/v1/classes', { token: tok.p1 });
  assert.equal(r.status, 403);
});

test('classes: thêm học sinh, kiểm tra sĩ số, chuyển lớp, gỡ khỏi lớp', async () => {
  const mk = (fullName, parents) => ({ fullName, dateOfBirth: '2021-05-01', gender: 'male', parents });
  const [s1, s2, s3, s4] = await M.Student.create([
    mk('Bé An', [ids.p1]), mk('Bé Bình', [ids.p2]), mk('Bé Cúc', [ids.p1, ids.p2]), mk('Bé Dũng', [ids.p2]),
  ]);
  Object.assign(ids, { s1: s1.id, s2: s2.id, s3: s3.id, s4: s4.id });

  let r = await app.call('POST', `/api/v1/classes/${ids.c1}/students`, {
    token: tok.principal, body: { studentIds: [ids.s1, ids.s2, ids.s3, ids.s4] },
  });
  assert.equal(r.status, 400, 'vượt capacity 3');

  r = await app.call('POST', `/api/v1/classes/${ids.c1}/students`, {
    token: tok.principal, body: { studentIds: [ids.s1, ids.s2, ids.s3] },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.total, 3);

  r = await app.call('GET', `/api/v1/classes/${ids.c1}`, { token: tok.principal });
  assert.equal(r.body.data.studentCount, 3);

  // chuyển s3 sang c2
  r = await app.call('POST', `/api/v1/classes/${ids.c2}/students`, { token: tok.principal, body: { studentIds: [ids.s3] } });
  assert.equal(r.status, 200);
  r = await app.call('GET', `/api/v1/classes/${ids.c1}/students`, { token: tok.principal });
  assert.equal(r.body.data.length, 2);
  assert.equal('allergies' in r.body.data[0], false, 'không lộ trường nhạy cảm');
  assert.equal(r.body.data[0].parents[0].fullName !== undefined, true);

  r = await app.call('DELETE', `/api/v1/classes/${ids.c1}/students/${ids.s2}`, { token: tok.principal });
  assert.equal(r.status, 200);
  r = await app.call('DELETE', `/api/v1/classes/${ids.c1}/students/${ids.s2}`, { token: tok.principal });
  assert.equal(r.status, 404, 'đã không còn trong lớp');
});

test('classes: checkOwnership – GV lớp khác 403, PH có con trong lớp 200, PH khác 403', async () => {
  // c1 có s1 (PH p1). c2 có s3 (PH p1, p2)
  let r = await app.call('GET', `/api/v1/classes/${ids.c1}`, { token: tok.t1 });
  assert.equal(r.status, 200);
  r = await app.call('GET', `/api/v1/classes/${ids.c1}`, { token: tok.t2 });
  assert.equal(r.status, 403);
  r = await app.call('GET', `/api/v1/classes/${ids.c1}/students`, { token: tok.t2 });
  assert.equal(r.status, 403);

  r = await app.call('GET', `/api/v1/classes/${ids.c1}`, { token: tok.p1 });
  assert.equal(r.status, 200);
  r = await app.call('GET', `/api/v1/classes/${ids.c1}`, { token: tok.p2 });
  assert.equal(r.status, 403, 'p2 không còn con ở c1 (s2 đã bị gỡ)');
  r = await app.call('GET', `/api/v1/classes/${ids.c2}`, { token: tok.p2 });
  assert.equal(r.status, 200);

  r = await app.call('PATCH', `/api/v1/classes/${ids.c1}`, { token: tok.t1, body: { room: 'P101' } });
  assert.equal(r.status, 403, 'teacher không sửa lớp');
});

test('classes: gán GV thay toàn bộ; >3 GV → 400; xoá lớp còn HS → 400; lớp trống xoá được', async () => {
  let r = await app.call('PATCH', `/api/v1/classes/${ids.c1}/teachers`, { token: tok.principal, body: { teachers: [ids.t1, ids.t2] } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.teachers.length, 2);

  r = await app.call('PATCH', `/api/v1/classes/${ids.c1}/teachers`, {
    token: tok.principal, body: { teachers: [ids.t1, ids.t2, ids.t1, ids.t2] },
  });
  assert.equal(r.status, 400);

  r = await app.call('GET', '/api/v1/classes', { token: tok.t2 });
  assert.equal(r.body.data.length, 2, 't2 giờ phụ trách 2 lớp');

  r = await app.call('DELETE', `/api/v1/classes/${ids.c1}`, { token: tok.principal });
  assert.equal(r.status, 400);

  r = await app.call('DELETE', `/api/v1/classes/${ids.c1old}`, { token: tok.principal });
  assert.equal(r.status, 200);
  r = await app.call('GET', `/api/v1/classes?schoolYear=${ids.sy1}`, { token: tok.principal });
  assert.equal(r.body.data.length, 0, 'mặc định ẩn lớp isActive=false');
  r = await app.call('GET', `/api/v1/classes?schoolYear=${ids.sy1}&isActive=false`, { token: tok.principal });
  assert.equal(r.body.data.length, 1);
});

test('school-years: xoá năm có lớp → 400; xoá năm hiện tại → 400', async () => {
  let r = await app.call('DELETE', `/api/v1/school-years/${ids.sy1}`, { token: tok.admin });
  assert.equal(r.status, 400);
  r = await app.call('DELETE', `/api/v1/school-years/${ids.sy2}`, { token: tok.admin });
  assert.equal(r.status, 400);
});

test('users/teachers kèm lớp; users/parents kèm con; teacher gọi /teachers → 403', async () => {
  let r = await app.call('GET', '/api/v1/users/teachers', { token: tok.principal });
  assert.equal(r.status, 200);
  const lan = r.body.data.find((t) => t.email === 'lan@kc.vn');
  assert.deepEqual(lan.classes.map((c) => c.name), ['Mầm 1']);

  r = await app.call('GET', '/api/v1/users/parents?search=An', { token: tok.t1 });
  assert.equal(r.status, 200);
  const an = r.body.data.find((p) => p.email === 'an@kc.vn');
  assert.equal(an.children.length, 2);

  r = await app.call('GET', '/api/v1/users/teachers', { token: tok.t1 });
  assert.equal(r.status, 403);
});
