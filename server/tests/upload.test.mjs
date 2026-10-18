// Test storage driver local: upload → asset ref → link có chữ ký; quyền xem ảnh theo lớp
process.env.LOG_LEVEL = 'error';
process.env.STORAGE_DRIVER = 'local';
process.env.UPLOAD_DIR = `uploads-test-${process.pid}`;

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setupDB, teardownDB, startApp } from './setup.mjs';
import { seedBasic } from './fixtures.mjs';

let app, M, ids, tok, base, storage;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function multipart(pathname, token, fields, files, method = 'POST') {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields || {})) fd.append(k, v);
  for (const f of files) fd.append(f.field, new Blob([f.buffer], { type: f.type }), f.name);
  const res = await fetch(base + pathname, { method, headers: { authorization: `Bearer ${token}` }, body: fd });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

before(async () => {
  await setupDB();
  app = await startApp();
  base = app.base;
  ({ M, ids, tok } = await seedBasic(app));
  storage = await import('../src/services/storage.js');
});
after(async () => {
  await app.close();
  await teardownDB();
  await fs.rm(path.resolve(process.cwd(), process.env.UPLOAD_DIR), { recursive: true, force: true });
});

test('upload/image → DB lưu asset ref, response trả link có chữ ký; tải được qua /files; sai chữ ký / hết hạn → 403', async () => {
  const r = await multipart('/api/v1/upload/image', tok.t1, {}, [{ field: 'file', buffer: PNG, type: 'image/png', name: 'a.png' }]);
  assert.equal(r.status, 200);
  const ref = storage.normalizeAssetInput(r.body.data.url);
  assert.match(ref, /^asset:\/\/local\/misc\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/);
  assert.match(r.body.data.url, /^\/api\/v1\/files\/local\/misc\/.+\?exp=\d+&sig=[0-9a-f]{32}$/);

  // Link ký → 200 image/png, không cần token
  const img = await fetch(base + r.body.data.url);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal(Buffer.from(await img.arrayBuffer()).equals(PNG), true);

  // Không có chữ ký / chữ ký sai → 403
  const bare = await fetch(base + r.body.data.url.split('?')[0]);
  assert.equal(bare.status, 403);
  const bad = await fetch(base + r.body.data.url.replace(/sig=[0-9a-f]+/, 'sig=' + '0'.repeat(32)));
  assert.equal(bad.status, 403);
  // Hết hạn → 403
  const expired = storage.signUrl(ref, { ttlMs: -1000 });
  assert.equal((await fetch(base + expired)).status, 403);
  // Đổi key (lấy tệp khác) với chữ ký cũ → 403
  const other = await fetch(base + r.body.data.url.replace(/\.png\?/, 'x.png?'));
  assert.equal(other.status, 403);
  // Vượt thư mục → 403 (key không hợp lệ)
  const trav = await fetch(`${base}/api/v1/files/local/..%2F..%2Fpackage.json?exp=${Date.now() + 10000}&sig=${'0'.repeat(32)}`);
  assert.equal(trav.status, 403);
});

test('định dạng: gif → 400 UPLOAD_TYPE; heic được nhận; > 10MB → 400', async () => {
  let r = await multipart('/api/v1/upload/image', tok.t1, {}, [{ field: 'file', buffer: PNG, type: 'image/gif', name: 'a.gif' }]);
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'UPLOAD_TYPE');
  r = await multipart('/api/v1/upload/image', tok.t1, {}, [{ field: 'file', buffer: PNG, type: 'image/heic', name: 'a.heic' }]);
  assert.equal(r.status, 200);
  assert.match(r.body.data.url, /\.heic\?exp=/);
  r = await multipart('/api/v1/upload/image', tok.t1, {}, [{ field: 'file', buffer: Buffer.alloc(10 * 1024 * 1024 + 1), type: 'image/jpeg', name: 'big.jpg' }]);
  assert.equal(r.status, 400);
});

test('album lớp c1: ảnh lưu ref, GV/PH lớp xem được link ký; PH lớp khác 403 không nhận được link', async () => {
  const r = await multipart('/api/v1/albums', tok.t1, { title: 'Album c1', class: ids.c1 }, [
    { field: 'photos', buffer: PNG, type: 'image/png', name: '1.png' },
    { field: 'photos', buffer: PNG, type: 'image/jpeg', name: '2.jpg' },
  ]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const album = r.body.data;
  assert.equal(album.photos.length, 2);
  assert.match(album.photos[0].url, /^\/api\/v1\/files\/local\/albums\//, 'response là link ký');
  const raw = await M.Album.findById(album._id).lean();
  assert.match(raw.photos[0].url, /^asset:\/\/local\/albums\//, 'DB lưu asset ref');

  // PH p1 có con ở c1 → 200 + link ký; danh sách cũng trả cover ký
  let g = await app.call('GET', `/api/v1/albums/${album._id}`, { token: tok.p1 });
  assert.equal(g.status, 200);
  assert.match(g.body.data.photos[0].url, /\?exp=\d+&sig=/);
  assert.equal((await fetch(base + g.body.data.photos[0].url)).status, 200);
  g = await app.call('GET', `/api/v1/albums?class=${ids.c1}`, { token: tok.p1 });
  assert.match(g.body.data[0].cover, /\?exp=/);

  // Tạo PH chỉ có con ở lớp c2 (không phải c1) → 403, không có link
  const outsider = await M.User.create({ fullName: 'PH lớp khác', email: 'other@kc.vn', role: 'parent', password: '123456' });
  await M.Student.create({ fullName: 'Bé khác', dateOfBirth: '2021-01-01', gender: 'male', class: ids.c2, parents: [outsider._id] });
  const lo = await app.call('POST', '/api/v1/auth/login', { body: { identifier: 'other@kc.vn', password: '123456' } });
  const tokOther = lo.body.data.accessToken;
  g = await app.call('GET', `/api/v1/albums/${album._id}`, { token: tokOther });
  assert.equal(g.status, 403);
  g = await app.call('GET', `/api/v1/albums?class=${ids.c1}`, { token: tokOther });
  assert.equal(g.status, 403);
  // GV lớp khác (t2) cũng 403
  g = await app.call('GET', `/api/v1/albums/${album._id}`, { token: tok.t2 });
  assert.equal(g.status, 403);

  // Xoá ảnh → tệp local bị xoá
  const key = raw.photos[0].url.replace('asset://local/', '');
  const abs = path.resolve(process.cwd(), process.env.UPLOAD_DIR, key);
  await fs.access(abs);
  const d = await app.call('DELETE', `/api/v1/albums/${album._id}/photos/${album.photos[0]._id}`, { token: tok.t1 });
  assert.equal(d.status, 200);
  await assert.rejects(fs.access(abs));
});

test('nhận xét ngày + chat: client gửi lại link ký → server quy về ref; response trả link ký mới', async () => {
  const up = await multipart('/api/v1/upload/images', tok.t1, {}, [{ field: 'files', buffer: PNG, type: 'image/png', name: 'r.png' }]);
  assert.equal(up.status, 200);
  const signed = up.body.data[0].url;
  let r = await app.call('POST', '/api/v1/daily-reports', { token: tok.t1, body: { student: ids.s1, date: new Date().toISOString().slice(0, 10), mood: 'happy', photos: [signed] } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const rep = await M.DailyReport.findById(r.body.data._id).lean();
  assert.equal(rep.photos[0], storage.normalizeAssetInput(signed), 'DB lưu ref chứ không lưu link ký');
  assert.match(r.body.data.photos[0], /\?exp=/);
  // URL ngoài vẫn được chấp nhận (ảnh demo), chuỗi rác → 400
  r = await app.call('PATCH', `/api/v1/daily-reports/${rep._id}`, { token: tok.t1, body: { photos: ['https://picsum.photos/seed/x/600/400'] } });
  assert.equal(r.status, 200);
  r = await app.call('PATCH', `/api/v1/daily-reports/${rep._id}`, { token: tok.t1, body: { photos: ['not a url'] } });
  assert.equal(r.status, 400);

  // Chat: upload tệp → gửi kèm → PH nhận link ký
  const f = await multipart('/api/v1/messages/upload', tok.t1, {}, [{ field: 'file', buffer: PNG, type: 'image/png', name: 'c.png' }]);
  assert.equal(f.status, 200);
  assert.equal(f.body.data.type, 'image');
  r = await app.call('POST', '/api/v1/messages', { token: tok.t1, body: { receiver: ids.p1, content: 'ảnh', attachments: [{ url: f.body.data.url, type: 'image', name: 'c.png' }] } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const h = await app.call('GET', `/api/v1/messages/${ids.t1}`, { token: tok.p1 });
  assert.match(h.body.data.items[0].attachments[0].url, /^\/api\/v1\/files\/local\/messages\/.+\?exp=/);
  const msg = await M.Message.findById(r.body.data._id).lean();
  assert.match(msg.attachments[0].url, /^asset:\/\/local\/messages\//);
});

test('ảnh đại diện bé qua multipart → DB lưu ref, hồ sơ trả link ký', async () => {
  const r = await multipart(`/api/v1/students/${ids.s1}/avatar`, tok.t1, {}, [{ field: 'avatar', buffer: PNG, type: 'image/png', name: 'av.png' }], 'PATCH');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.match(r.body.data.avatar, /^\/api\/v1\/files\/local\/students\//);
  const st = await M.Student.findById(ids.s1).lean();
  assert.match(st.avatar, /^asset:\/\/local\/students\//);
  const me = await app.call('GET', '/api/v1/auth/me', { token: tok.p1 });
  assert.match(me.body.data.children.find((k) => k._id === ids.s1).avatar, /\?exp=/);
});
