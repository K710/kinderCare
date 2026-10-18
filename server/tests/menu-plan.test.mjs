// Test 3.6: Menu + LessonPlan
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDB, teardownDB, startApp } from './setup.mjs';
import { seedBasic } from './fixtures.mjs';

process.env.LOG_LEVEL = 'error';
let app, M, ids, tok;
const WEEK = '2026-10-14'; // thứ 4 → weekStart 2026-10-12

before(async () => {
  await setupDB();
  app = await startApp();
  ({ M, ids, tok } = await seedBasic(app));
});
after(async () => {
  await app.close();
  await teardownDB();
});

const days = [{ dayOfWeek: 1, breakfast: ['Cháo'], lunch: ['Cơm', 'Cá'], snack: ['Sữa'] }];

/* ---------- Menu ---------- */
test('menu: P tạo nháp (weekStart chuẩn hoá về thứ 2); trùng tuần+nhóm 409; T tạo 403; trùng thứ 400', async () => {
  let r = await app.call('POST', '/api/v1/menus', { token: tok.principal, body: { weekStart: WEEK, days } });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.weekStart, '2026-10-12T00:00:00.000Z');
  assert.equal(r.body.data.ageGroup, 'all');
  assert.equal(r.body.data.status, 'draft');
  ids.m1 = r.body.data._id;

  r = await app.call('POST', '/api/v1/menus', { token: tok.principal, body: { weekStart: '2026-10-16', days } });
  assert.equal(r.status, 409, 'cùng tuần');
  r = await app.call('POST', '/api/v1/menus', { token: tok.principal, body: { weekStart: WEEK, ageGroup: 'mam', days } });
  assert.equal(r.status, 201, 'khác nhóm tuổi được');
  ids.m2 = r.body.data._id;
  r = await app.call('POST', '/api/v1/menus', { token: tok.t1, body: { weekStart: WEEK, days } });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/menus', { token: tok.principal, body: { weekStart: '2026-10-20', days: [...days, ...days] } });
  assert.equal(r.status, 400);
});

test('menu luồng duyệt: submit rỗng 400; submit → pending; sửa khi pending 400; approve; reject cần lý do; sửa sau reject → draft', async () => {
  let r = await app.call('POST', '/api/v1/menus', { token: tok.principal, body: { weekStart: '2026-10-21' } });
  const empty = r.body.data._id;
  r = await app.call('PATCH', `/api/v1/menus/${empty}/submit`, { token: tok.principal });
  assert.equal(r.status, 400);

  r = await app.call('PATCH', `/api/v1/menus/${ids.m1}/approve`, { token: tok.principal });
  assert.equal(r.status, 400, 'chưa pending');
  r = await app.call('PATCH', `/api/v1/menus/${ids.m1}/submit`, { token: tok.principal });
  assert.equal(r.body.data.status, 'pending');
  r = await app.call('PATCH', `/api/v1/menus/${ids.m1}`, { token: tok.principal, body: { days } });
  assert.equal(r.status, 400);
  r = await app.call('PATCH', `/api/v1/menus/${ids.m1}/approve`, { token: tok.principal });
  assert.equal(r.body.data.status, 'approved');
  assert.ok(r.body.data.approvedAt);
  r = await app.call('DELETE', `/api/v1/menus/${ids.m1}`, { token: tok.principal });
  assert.equal(r.status, 400, 'không xoá đã duyệt');

  r = await app.call('PATCH', `/api/v1/menus/${ids.m2}/submit`, { token: tok.principal });
  r = await app.call('PATCH', `/api/v1/menus/${ids.m2}/reject`, { token: tok.principal, body: {} });
  assert.equal(r.status, 400);
  r = await app.call('PATCH', `/api/v1/menus/${ids.m2}/reject`, { token: tok.principal, body: { reason: 'Thiếu rau' } });
  assert.equal(r.body.data.status, 'rejected');
  assert.equal(r.body.data.rejectReason, 'Thiếu rau');
  r = await app.call('PATCH', `/api/v1/menus/${ids.m2}`, { token: tok.principal, body: { days: [{ dayOfWeek: 1, lunch: ['Rau'] }] } });
  assert.equal(r.body.data.status, 'draft');
  assert.equal(r.body.data.rejectReason, '');
  r = await app.call('DELETE', `/api/v1/menus/${empty}`, { token: tok.principal });
  assert.equal(r.status, 200);
});

test('menu: list filter status (T được); T/PH xem chi tiết chỉ bản approved; /current theo nhóm tuổi', async () => {
  let r = await app.call('GET', '/api/v1/menus?status=approved', { token: tok.t1 });
  assert.equal(r.body.data.length, 1);
  r = await app.call('GET', '/api/v1/menus', { token: tok.p1 });
  assert.equal(r.status, 403);

  r = await app.call('GET', `/api/v1/menus/${ids.m1}`, { token: tok.p1 });
  assert.equal(r.status, 200);
  r = await app.call('GET', `/api/v1/menus/${ids.m2}`, { token: tok.p1 });
  assert.equal(r.status, 403, 'draft');
  r = await app.call('GET', `/api/v1/menus/${ids.m2}`, { token: tok.principal });
  assert.equal(r.status, 200);

  // p1 có con ở c1 (mam) và c2 (choi); tuần 12/10 chỉ có bản 'all' approved → cả 2 nhóm dùng 'all'
  r = await app.call('GET', `/api/v1/menus/current?date=${WEEK}`, { token: tok.p1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.weekStart, '2026-10-12T00:00:00.000Z');
  assert.deepEqual(r.body.data.items.map((i) => i.ageGroup).sort(), ['choi', 'mam']);
  assert.ok(r.body.data.items.every((i) => i.menu && i.menu.ageGroup === 'all'));
  // duyệt bản 'mam' → nhóm mam dùng bản riêng
  await app.call('PATCH', `/api/v1/menus/${ids.m2}/submit`, { token: tok.principal });
  await app.call('PATCH', `/api/v1/menus/${ids.m2}/approve`, { token: tok.principal });
  r = await app.call('GET', `/api/v1/menus/current?date=${WEEK}`, { token: tok.t1 });
  assert.deepEqual(r.body.data.items.map((i) => i.ageGroup), ['mam']);
  assert.equal(r.body.data.items[0].menu.ageGroup, 'mam');
  r = await app.call('GET', `/api/v1/menus/current?date=2026-11-10`, { token: tok.t1 });
  assert.equal(r.body.data.items[0].menu, null, 'tuần chưa có');
});

/* ---------- LessonPlan ---------- */
const planDays = [{ dayOfWeek: 1, activities: [{ time: '08:00', title: 'Hát' }] }];

test('plan: T lớp mình tạo 201; T lớp khác 403; trùng tuần 409; P tạo 403', async () => {
  let r = await app.call('POST', '/api/v1/lesson-plans', { token: tok.t1, body: { class: ids.c1, weekStart: WEEK, theme: 'Gia đình', days: planDays } });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.weekStart, '2026-10-12T00:00:00.000Z');
  assert.equal(r.body.data.teacher.fullName, 'Cô Lan');
  ids.lp1 = r.body.data._id;
  r = await app.call('POST', '/api/v1/lesson-plans', { token: tok.t2, body: { class: ids.c1, weekStart: '2026-10-20', days: planDays } });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/lesson-plans', { token: tok.t1, body: { class: ids.c1, weekStart: '2026-10-15', days: planDays } });
  assert.equal(r.status, 409);
  r = await app.call('POST', '/api/v1/lesson-plans', { token: tok.principal, body: { class: ids.c1, weekStart: WEEK, days: planDays } });
  assert.equal(r.status, 403);
  r = await app.call('POST', '/api/v1/lesson-plans', { token: tok.t2, body: { class: ids.c2, weekStart: WEEK } });
  assert.equal(r.status, 201);
  ids.lp2 = r.body.data._id;
});

test('plan luồng duyệt: T submit (rỗng 400); T không approve; P approve/reject; PH chỉ xem approved', async () => {
  let r = await app.call('PATCH', `/api/v1/lesson-plans/${ids.lp2}/submit`, { token: tok.t2 });
  assert.equal(r.status, 400, 'chưa có hoạt động');

  r = await app.call('GET', `/api/v1/lesson-plans/${ids.lp1}`, { token: tok.p1 });
  assert.equal(r.status, 403, 'PH chưa xem được draft');
  r = await app.call('PATCH', `/api/v1/lesson-plans/${ids.lp1}/submit`, { token: tok.t2 });
  assert.equal(r.status, 403);
  r = await app.call('PATCH', `/api/v1/lesson-plans/${ids.lp1}/submit`, { token: tok.t1 });
  assert.equal(r.body.data.status, 'pending');
  r = await app.call('PATCH', `/api/v1/lesson-plans/${ids.lp1}/approve`, { token: tok.t1 });
  assert.equal(r.status, 403);
  r = await app.call('PATCH', `/api/v1/lesson-plans/${ids.lp1}/reject`, { token: tok.principal, body: { reason: 'Bổ sung mục tiêu' } });
  assert.equal(r.body.data.status, 'rejected');
  r = await app.call('PATCH', `/api/v1/lesson-plans/${ids.lp1}`, { token: tok.t1, body: { days: [{ dayOfWeek: 1, activities: [{ title: 'Hát', goal: 'Thuộc bài' }] }] } });
  assert.equal(r.body.data.status, 'draft');
  await app.call('PATCH', `/api/v1/lesson-plans/${ids.lp1}/submit`, { token: tok.t1 });
  r = await app.call('PATCH', `/api/v1/lesson-plans/${ids.lp1}/approve`, { token: tok.principal });
  assert.equal(r.body.data.status, 'approved');
  assert.equal(r.body.data.approvedBy.fullName, 'Hiệu trưởng');

  r = await app.call('GET', `/api/v1/lesson-plans/${ids.lp1}`, { token: tok.p1 });
  assert.equal(r.status, 200);
  r = await app.call('GET', `/api/v1/lesson-plans/${ids.lp1}`, { token: tok.p2 });
  assert.equal(r.status, 200, 'p2 có con s2 ở c1');
  r = await app.call('PATCH', `/api/v1/lesson-plans/${ids.lp1}`, { token: tok.t1, body: { theme: 'x' } });
  assert.equal(r.status, 400, 'đã duyệt không sửa');
  r = await app.call('DELETE', `/api/v1/lesson-plans/${ids.lp1}`, { token: tok.t1 });
  assert.equal(r.status, 400);
  r = await app.call('DELETE', `/api/v1/lesson-plans/${ids.lp2}`, { token: tok.t1 });
  assert.equal(r.status, 403);
  r = await app.call('DELETE', `/api/v1/lesson-plans/${ids.lp2}`, { token: tok.t2 });
  assert.equal(r.status, 200);
});

test('plan list: P tất cả; T lớp mình; T lọc lớp khác 403', async () => {
  await app.call('POST', '/api/v1/lesson-plans', { token: tok.t2, body: { class: ids.c2, weekStart: WEEK, days: planDays } });
  let r = await app.call('GET', '/api/v1/lesson-plans', { token: tok.principal });
  assert.equal(r.body.data.length, 2);
  r = await app.call('GET', '/api/v1/lesson-plans', { token: tok.t1 });
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.data[0].class.name, 'Mầm 1');
  r = await app.call('GET', `/api/v1/lesson-plans?class=${ids.c2}`, { token: tok.t1 });
  assert.equal(r.status, 403);
  r = await app.call('GET', `/api/v1/lesson-plans?status=approved&weekStart=${WEEK}`, { token: tok.principal });
  assert.equal(r.body.data.length, 1);
});
