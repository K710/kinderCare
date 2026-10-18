// Test 3.4: DailyReport + Album + Upload
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDB, teardownDB, startApp } from './setup.mjs';
import { seedBasic } from './fixtures.mjs';

process.env.LOG_LEVEL = 'error';

let app, M, ids, tok;
const D = '2026-10-16';

before(async () => {
  await setupDB();
  app = await startApp();
  ({ M, ids, tok } = await seedBasic(app));
});
after(async () => {
  await app.close();
  await teardownDB();
});

const multipart = async (method, path, token, fields = {}, files = []) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  for (const f of files) fd.append(f.field, new Blob([Buffer.from('x')], { type: f.type }), f.name);
  const r = await fetch(app.base + path, { method, headers: { authorization: `Bearer ${token}` }, body: fd });
  return { status: r.status, body: await r.json() };
};

/* ---------- DailyReport ---------- */
test('report: GV tạo 201 (class lấy từ bé); trùng ngày 409; GV khác 403; ngày tương lai 400; principal 403', async () => {
  const body = { student: ids.s1, date: D, meals: { lunch: 'good' }, sleep: { duration: 90, quality: 'good' }, mood: 'happy', comment: 'Ngoan' };
  let r = await app.call('POST', '/api/v1/daily-reports', { token: tok.t1, body });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.class, ids.c1);
  assert.equal(r.body.data.teacher.fullName, 'Cô Lan');
  assert.equal(r.body.data.date, '2026-10-16T00:00:00.000Z');
  ids.r1 = r.body.data._id;

  r = await app.call('POST', '/api/v1/daily-reports', { token: tok.t1, body });
  assert.equal(r.status, 409);
  r = await app.call('POST', '/api/v1/daily-reports', { token: tok.t2, body });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/daily-reports', { token: tok.t1, body: { ...body, date: '2099-01-01' } });
  assert.equal(r.status, 400);
  r = await app.call('POST', '/api/v1/daily-reports', { token: tok.principal, body });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/daily-reports', { token: tok.t1, body: { ...body, mood: 'angry' } });
  assert.equal(r.status, 400, 'enum sai');
});

test('report bulk: upsert cả lớp, bé đã có → cập nhật không mất trường cũ', async () => {
  let r = await app.call('POST', '/api/v1/daily-reports/bulk', {
    token: tok.t1, body: { class: ids.c1, date: D, students: [ids.s1, ids.s2], activities: ['Vẽ tranh'], mood: 'normal' },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data, { created: 1, updated: 1, total: 2 });
  const r1 = await M.DailyReport.findById(ids.r1);
  assert.equal(r1.mood, 'normal');
  assert.equal(r1.comment, 'Ngoan', 'trường không gửi giữ nguyên');
  assert.deepEqual(r1.activities, ['Vẽ tranh']);

  r = await app.call('POST', '/api/v1/daily-reports/bulk', { token: tok.t1, body: { class: ids.c1, date: D, students: [ids.s3] } });
  assert.equal(r.status, 400, 's3 không thuộc c1');
});

test('report list theo lớp/ngày; lịch sử bé với quyền; chi tiết', async () => {
  let r = await app.call('GET', `/api/v1/daily-reports?class=${ids.c1}&date=${D}`, { token: tok.principal });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.items.length, 2);
  assert.ok(r.body.data.items.every((i) => i.report));
  r = await app.call('GET', `/api/v1/daily-reports?class=${ids.c1}&date=${D}`, { token: tok.t2 });
  assert.equal(r.status, 403);

  r = await app.call('GET', `/api/v1/daily-reports/student/${ids.s1}?from=2026-10-01&to=2026-10-31`, { token: tok.p1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].teacher.fullName, 'Cô Lan');
  r = await app.call('GET', `/api/v1/daily-reports/student/${ids.s1}`, { token: tok.p2 });
  assert.equal(r.status, 403);

  r = await app.call('GET', `/api/v1/daily-reports/${ids.r1}`, { token: tok.p1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.student.fullName, 'Bé An');
  r = await app.call('GET', `/api/v1/daily-reports/${ids.r1}`, { token: tok.t2 });
  assert.equal(r.status, 403);
});

test('report: PH đánh dấu đã xem (idempotent); GV sửa/xoá; PH không sửa; GV khác không xoá', async () => {
  let r = await app.call('PATCH', `/api/v1/daily-reports/${ids.r1}/seen`, { token: tok.p1 });
  assert.equal(r.status, 200);
  const seenAt = r.body.data.parentSeenAt;
  assert.ok(seenAt);
  r = await app.call('PATCH', `/api/v1/daily-reports/${ids.r1}/seen`, { token: tok.p1 });
  assert.equal(r.body.data.parentSeenAt, seenAt);
  r = await app.call('PATCH', `/api/v1/daily-reports/${ids.r1}/seen`, { token: tok.p2 });
  assert.equal(r.status, 403);

  r = await app.call('PATCH', `/api/v1/daily-reports/${ids.r1}`, { token: tok.p1, body: { comment: 'x' } });
  assert.equal(r.status, 403);
  r = await app.call('PATCH', `/api/v1/daily-reports/${ids.r1}`, { token: tok.t1, body: { comment: 'Rất ngoan', toilet: 2 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.comment, 'Rất ngoan');
  r = await app.call('PATCH', `/api/v1/daily-reports/${ids.r1}`, { token: tok.t1, body: { student: ids.s2 } });
  assert.equal(r.status, 400, 'strict');

  r = await app.call('DELETE', `/api/v1/daily-reports/${ids.r1}`, { token: tok.t2 });
  assert.equal(r.status, 403);
  r = await app.call('DELETE', `/api/v1/daily-reports/${ids.r1}`, { token: tok.t1 });
  assert.equal(r.status, 200);
  r = await app.call('GET', `/api/v1/daily-reports/${ids.r1}`, { token: tok.t1 });
  assert.equal(r.status, 404);
});

/* ---------- Album ---------- */
test('album tạo multipart: thiếu title 400; GV lớp khác 403; có ảnh nhưng chưa cấu hình Cloudinary 503; không ảnh → 201', async () => {
  let r = await multipart('POST', '/api/v1/albums', tok.t1, { class: ids.c1 });
  assert.equal(r.status, 400);
  r = await multipart('POST', '/api/v1/albums', tok.t2, { title: 'Dã ngoại', class: ids.c1 });
  assert.equal(r.status, 403);
  r = await multipart('POST', '/api/v1/albums', tok.t1, { title: 'Dã ngoại', class: ids.c1 }, [{ field: 'photos', type: 'image/png', name: 'a.png' }]);
  assert.equal(r.status, 503);
  assert.equal(r.body.code, 'UPLOAD_DISABLED');
  r = await multipart('POST', '/api/v1/albums', tok.t1, { title: 'Dã ngoại', class: ids.c1, date: D, description: 'Công viên' });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.class.name, 'Mầm 1');
  assert.equal(r.body.data.createdBy.fullName, 'Cô Lan');
  ids.a1 = r.body.data._id;
  r = await multipart('POST', '/api/v1/albums', tok.t1, { title: 'Trung thu', class: ids.c1 }, [{ field: 'photos', type: 'text/plain', name: 'a.txt' }]);
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'UPLOAD_TYPE');
});

test('album list theo quyền: PH lớp con, GV lớp mình, P tất cả; cover/photoCount; PH lọc lớp khác 403', async () => {
  // Thêm album c2 trực tiếp kèm ảnh
  const a2 = await M.Album.create({
    title: 'Sinh nhật', class: ids.c2, date: new Date('2026-10-10T00:00:00Z'), createdBy: ids.t2,
    photos: [{ url: 'https://x/1.jpg', publicId: 'p1' }, { url: 'https://x/2.jpg', publicId: 'p2' }],
  });
  ids.a2 = a2.id;

  let r = await app.call('GET', '/api/v1/albums', { token: tok.principal });
  assert.equal(r.body.data.length, 2);
  const sn = r.body.data.find((a) => a.title === 'Sinh nhật');
  assert.equal(sn.cover, 'https://x/1.jpg');
  assert.equal(sn.photoCount, 2);
  assert.equal('photos' in sn, false);

  r = await app.call('GET', '/api/v1/albums', { token: tok.t1 });
  assert.deepEqual(r.body.data.map((a) => a.title), ['Dã ngoại']);
  r = await app.call('GET', '/api/v1/albums', { token: tok.p2 });
  assert.deepEqual(r.body.data.map((a) => a.title), ['Dã ngoại', 'Sinh nhật'], 'p2 có con ở c1 (s2) và c2 (s3)');
  // p1 chỉ còn con ở c1 và c2 → đổi s3 sang left để kiểm tra lọc
  await M.Student.updateOne({ _id: ids.s3 }, { status: 'left', class: null });
  r = await app.call('GET', '/api/v1/albums', { token: tok.p2 });
  assert.deepEqual(r.body.data.map((a) => a.title), ['Dã ngoại']);
  r = await app.call('GET', `/api/v1/albums?class=${ids.c2}`, { token: tok.p2 });
  assert.equal(r.status, 403);
  r = await app.call('GET', `/api/v1/albums?from=2026-10-15`, { token: tok.principal });
  assert.equal(r.body.data.length, 1);
});

test('album chi tiết/sửa/caption/xoá ảnh/xoá album theo quyền', async () => {
  let r = await app.call('GET', `/api/v1/albums/${ids.a2}`, { token: tok.t1 });
  assert.equal(r.status, 403);
  r = await app.call('GET', `/api/v1/albums/${ids.a2}`, { token: tok.t2 });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.photos.length, 2);
  const photoId = r.body.data.photos[0]._id;

  r = await app.call('PATCH', `/api/v1/albums/${ids.a2}`, { token: tok.t2, body: { title: 'Sinh nhật tháng 10', class: ids.c1 } });
  assert.equal(r.status, 400, 'strict: không đổi lớp');
  r = await app.call('PATCH', `/api/v1/albums/${ids.a2}`, { token: tok.t2, body: { title: 'Sinh nhật tháng 10' } });
  assert.equal(r.body.data.title, 'Sinh nhật tháng 10');

  r = await app.call('PATCH', `/api/v1/albums/${ids.a2}/photos/${photoId}`, { token: tok.t2, body: { caption: 'Thổi nến' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.caption, 'Thổi nến');

  r = await app.call('DELETE', `/api/v1/albums/${ids.a2}/photos/${photoId}`, { token: tok.t1 });
  assert.equal(r.status, 403);
  r = await app.call('DELETE', `/api/v1/albums/${ids.a2}/photos/${photoId}`, { token: tok.t2 });
  assert.equal(r.status, 200);
  r = await app.call('DELETE', `/api/v1/albums/${ids.a2}/photos/${photoId}`, { token: tok.t2 });
  assert.equal(r.status, 404);
  assert.equal((await M.Album.findById(ids.a2)).photos.length, 1);

  r = await multipart('POST', `/api/v1/albums/${ids.a2}/photos`, tok.t2, {}, []);
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'NO_FILE');

  r = await app.call('DELETE', `/api/v1/albums/${ids.a2}`, { token: tok.principal });
  assert.equal(r.status, 403, 'principal không xoá album');
  r = await app.call('DELETE', `/api/v1/albums/${ids.a2}`, { token: tok.t2 });
  assert.equal(r.status, 200);
  assert.equal(await M.Album.countDocuments(), 1);
});

/* ---------- Upload ---------- */
test('upload: không file 400; parent gọi /images 403; có file nhưng chưa cấu hình → 503', async () => {
  let r = await multipart('POST', '/api/v1/upload/image', tok.p1, {});
  assert.equal(r.status, 400);
  r = await multipart('POST', '/api/v1/upload/images', tok.p1, {}, [{ field: 'files', type: 'image/png', name: 'a.png' }]);
  assert.equal(r.status, 403);
  r = await multipart('POST', '/api/v1/upload/image', tok.p1, {}, [{ field: 'file', type: 'image/jpeg', name: 'a.jpg' }]);
  assert.equal(r.status, 503);
});
