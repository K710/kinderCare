// Test 3.9: Notification + Message
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

/* ---------- Notification ---------- */
test('tạo thông báo: P scope all/role/class; T chỉ class lớp mình; T lớp khác 403; T scope all 403; PH 403; thiếu target 400', async () => {
  let r = await app.call('POST', '/api/v1/notifications', { token: tok.principal, body: { title: 'Nghỉ lễ', body: 'Trường nghỉ 20/10', scope: 'all' } });
  assert.equal(r.status, 201);
  r = await app.call('POST', '/api/v1/notifications', { token: tok.principal, body: { title: 'Họp GV', body: 'Thứ 6', scope: 'role', targetRole: 'teacher' } });
  assert.equal(r.status, 201);
  r = await app.call('POST', '/api/v1/notifications', { token: tok.principal, body: { title: 'Lớp Chồi', body: 'Dã ngoại', scope: 'class', targetClass: ids.c2 } });
  assert.equal(r.status, 201);
  r = await app.call('POST', '/api/v1/notifications', { token: tok.t1, body: { title: 'Mầm 1', body: 'Mang áo mưa', scope: 'class', targetClass: ids.c1 } });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.type, 'class');
  ids.nC1 = r.body.data._id;

  r = await app.call('POST', '/api/v1/notifications', { token: tok.t1, body: { title: 'x', body: 'y', scope: 'class', targetClass: ids.c2 } });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/notifications', { token: tok.t1, body: { title: 'x', body: 'y', scope: 'all' } });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/notifications', { token: tok.p1, body: { title: 'x', body: 'y', scope: 'all' } });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/notifications', { token: tok.principal, body: { title: 'x', body: 'y', scope: 'class' } });
  assert.equal(r.status, 400);
  r = await app.call('POST', '/api/v1/notifications', { token: tok.principal, body: { title: 'x', body: 'y', scope: 'user', targetUsers: [ids.p2] } });
  assert.equal(r.status, 201);
});

test('list theo scope: t1 thấy all+role teacher+class c1; p1 thấy all+class c1+c2; p2 thêm user; isRead + unread-count', async () => {
  let r = await app.call('GET', '/api/v1/notifications', { token: tok.t1 });
  assert.deepEqual(r.body.data.map((n) => n.title).sort(), ['Họp GV', 'Mầm 1', 'Nghỉ lễ']);
  assert.ok(r.body.data.every((n) => n.isRead === false && !('readBy' in n)));

  r = await app.call('GET', '/api/v1/notifications', { token: tok.p1 });
  assert.deepEqual(r.body.data.map((n) => n.title).sort(), ['Lớp Chồi', 'Mầm 1', 'Nghỉ lễ']);
  r = await app.call('GET', '/api/v1/notifications', { token: tok.p2 });
  assert.equal(r.body.data.length, 4);
  r = await app.call('GET', '/api/v1/notifications/unread-count', { token: tok.p2 });
  assert.equal(r.body.data.count, 4);
  r = await app.call('GET', '/api/v1/notifications', { token: tok.admin });
  assert.deepEqual(r.body.data.map((n) => n.title), ['Nghỉ lễ']);
});

test('đọc 1 / đọc tất cả; đọc thông báo không thuộc mình → 404; xoá chỉ A/P', async () => {
  let r = await app.call('PATCH', `/api/v1/notifications/${ids.nC1}/read`, { token: tok.p1 });
  assert.equal(r.status, 200);
  r = await app.call('GET', '/api/v1/notifications?unread=true', { token: tok.p1 });
  assert.equal(r.body.data.length, 2);
  r = await app.call('GET', '/api/v1/notifications', { token: tok.p1 });
  assert.equal(r.body.data.find((n) => n._id === ids.nC1).isRead, true);
  r = await app.call('PATCH', `/api/v1/notifications/${ids.nC1}/read`, { token: tok.admin });
  assert.equal(r.status, 404, 'admin không thuộc lớp');

  r = await app.call('PATCH', '/api/v1/notifications/read-all', { token: tok.p1 });
  assert.equal(r.body.data.updated, 2);
  r = await app.call('GET', '/api/v1/notifications/unread-count', { token: tok.p1 });
  assert.equal(r.body.data.count, 0);
  r = await app.call('GET', '/api/v1/notifications/unread-count', { token: tok.p2 });
  assert.equal(r.body.data.count, 4, 'không ảnh hưởng người khác');

  r = await app.call('DELETE', `/api/v1/notifications/${ids.nC1}`, { token: tok.t1 });
  assert.equal(r.status, 403);
  r = await app.call('DELETE', `/api/v1/notifications/${ids.nC1}`, { token: tok.principal });
  assert.equal(r.status, 200);
});

test('tích hợp: duyệt đơn nghỉ / xác nhận thuốc → PH nhận thông báo đích danh; duyệt kế hoạch → GV nhận', async () => {
  let r = await app.call('POST', '/api/v1/leave-requests', { token: tok.p1, body: { student: ids.s1, fromDate: '2026-10-20', toDate: '2026-10-20', reason: 'Bé ốm' } });
  await app.call('PATCH', `/api/v1/leave-requests/${r.body.data._id}/approve`, { token: tok.t1, body: {} });
  r = await app.call('GET', '/api/v1/notifications?unread=true', { token: tok.p1 });
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].type, 'leave');
  assert.match(r.body.data[0].body, /Bé An/);
  assert.equal(r.body.data[0].sender.fullName, 'Cô Lan');

  r = await app.call('POST', '/api/v1/medicine-notes', { token: tok.p2, body: { student: ids.s2, medicines: [{ name: 'A', dosage: '1', time: 'trưa' }], fromDate: '2026-10-20', toDate: '2026-10-20' } });
  await app.call('PATCH', `/api/v1/medicine-notes/${r.body.data._id}/confirm`, { token: tok.t1 });
  r = await app.call('GET', '/api/v1/notifications?unread=true', { token: tok.p2 });
  assert.equal(r.body.data.filter((n) => n.type === 'medicine').length, 1);

  r = await app.call('POST', '/api/v1/lesson-plans', { token: tok.t2, body: { class: ids.c2, weekStart: '2026-10-20', days: [{ dayOfWeek: 1, activities: [{ title: 'Hát' }] }] } });
  await app.call('PATCH', `/api/v1/lesson-plans/${r.body.data._id}/submit`, { token: tok.t2 });
  await app.call('PATCH', `/api/v1/lesson-plans/${r.body.data._id}/reject`, { token: tok.principal, body: { reason: 'Thiếu mục tiêu' } });
  r = await app.call('GET', '/api/v1/notifications?unread=true', { token: tok.t2 });
  assert.ok(r.body.data.some((n) => n.title.includes('bị từ chối') && n.body.includes('Thiếu mục tiêu')));
});

/* ---------- Message ---------- */
test('contacts: T thấy PH lớp mình kèm bé; PH thấy GV lớp con; principal 403', async () => {
  let r = await app.call('GET', '/api/v1/messages/contacts', { token: tok.t1 });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.map((c) => c.user.fullName).sort(), ['PH An', 'PH Bình']);
  assert.deepEqual(r.body.data.find((c) => c.user.fullName === 'PH An').students.map((s) => s.fullName), ['Bé An']);

  r = await app.call('GET', '/api/v1/messages/contacts', { token: tok.p1 });
  assert.deepEqual(r.body.data.map((c) => c.user.fullName).sort(), ['Cô Lan', 'Cô Mai'], 'p1 có con ở c1 (Lan) và c2 (Mai)');
  assert.equal(r.body.data.find((c) => c.user.fullName === 'Cô Mai').students[0].fullName, 'Bé Cúc');

  r = await app.call('GET', '/api/v1/messages/contacts', { token: tok.principal });
  assert.equal(r.status, 403);
});

test('gửi tin: T→PH có bé chung 201; T→PH không liên quan 403; PH→PH 403; tự nhắn 400; rỗng 400', async () => {
  let r = await app.call('POST', '/api/v1/messages', { token: tok.t1, body: { receiver: ids.p1, content: 'Chào chị, hôm nay bé ăn tốt', student: ids.s1 } });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.conversationId, [ids.t1, ids.p1].sort().join('_'));
  assert.equal(r.body.data.readAt, null);
  r = await app.call('POST', '/api/v1/messages', { token: tok.p1, body: { receiver: ids.t1, content: 'Cảm ơn cô' } });
  assert.equal(r.status, 201);
  r = await app.call('POST', '/api/v1/messages', { token: tok.p1, body: { receiver: ids.t1, attachments: [{ url: 'https://x/a.jpg' }] } });
  assert.equal(r.status, 201);

  // t2 (c2) ↔ p2: p2 có con s3 ở c2 → được
  r = await app.call('POST', '/api/v1/messages', { token: tok.t2, body: { receiver: ids.p2, content: 'Hi' } });
  assert.equal(r.status, 201);
  // t2 ↔ p? không có bé chung: chuyển s3 khỏi c2 rồi thử
  await M.Student.updateOne({ _id: ids.s3 }, { class: null });
  r = await app.call('POST', '/api/v1/messages', { token: tok.t2, body: { receiver: ids.p1, content: 'Hi' } });
  assert.equal(r.status, 403);
  await M.Student.updateOne({ _id: ids.s3 }, { class: ids.c2 });

  r = await app.call('POST', '/api/v1/messages', { token: tok.p1, body: { receiver: ids.p2, content: 'Hi' } });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/messages', { token: tok.t1, body: { receiver: ids.t1, content: 'Hi' } });
  assert.equal(r.status, 400);
  r = await app.call('POST', '/api/v1/messages', { token: tok.t1, body: { receiver: ids.p1 } });
  assert.equal(r.status, 400);
});

test('conversations: tin cuối + unread; history cursor; markRead; unread-count', async () => {
  let r = await app.call('GET', '/api/v1/messages/conversations', { token: tok.t1 });
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].user.fullName, 'PH An');
  assert.equal(r.body.data[0].unread, 2, 'p1 gửi 2 tin t1 chưa đọc');
  assert.deepEqual(r.body.data[0].lastMessage.attachments[0].url, 'https://x/a.jpg');

  r = await app.call('GET', '/api/v1/messages/unread-count', { token: tok.t1 });
  assert.equal(r.body.data.count, 2);
  r = await app.call('GET', '/api/v1/messages/unread-count', { token: tok.p2 });
  assert.equal(r.body.data.count, 1);

  r = await app.call('GET', `/api/v1/messages/${ids.p1}?limit=2`, { token: tok.t1 });
  assert.equal(r.body.data.items.length, 2);
  assert.equal(r.body.data.hasMore, true);
  const before = r.body.data.items[1].createdAt;
  r = await app.call('GET', `/api/v1/messages/${ids.p1}?limit=2&before=${before}`, { token: tok.t1 });
  assert.equal(r.body.data.items.length, 1);
  assert.equal(r.body.data.hasMore, false);
  assert.equal(r.body.data.items[0].student.fullName, 'Bé An');
  r = await app.call('GET', `/api/v1/messages/${ids.p1}`, { token: tok.t2 });
  assert.equal(r.status, 200, 't2 dạy c2 nơi bé Cúc (con p1) học → được xem, nhưng rỗng');
  assert.equal(r.body.data.items.length, 0);
  await M.Student.updateOne({ _id: ids.s3 }, { class: null });
  r = await app.call('GET', `/api/v1/messages/${ids.p1}`, { token: tok.t2 });
  assert.equal(r.status, 403, 'không còn bé chung');
  await M.Student.updateOne({ _id: ids.s3 }, { class: ids.c2 });

  r = await app.call('PATCH', `/api/v1/messages/${ids.p1}/read`, { token: tok.t1 });
  assert.equal(r.body.data.updated, 2);
  r = await app.call('GET', '/api/v1/messages/conversations', { token: tok.t1 });
  assert.equal(r.body.data[0].unread, 0);
  r = await app.call('GET', '/api/v1/messages/conversations', { token: tok.p1 });
  assert.equal(r.body.data[0].unread, 1, 'p1 còn 1 tin của t1 chưa đọc');
});
