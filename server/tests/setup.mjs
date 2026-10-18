// Khởi tạo DB cho test: ưu tiên TEST_MONGO_URI (Mongo thật), không có thì dùng MongoMemoryReplSet (có transaction)
import mongoose from 'mongoose';

let repl = null;

export async function setupDB() {
  let uri = process.env.TEST_MONGO_URI;
  if (uri) {
    // Mỗi file test (1 process) dùng DB riêng để chạy song song không đụng nhau
    const u = new URL(uri);
    u.pathname = `/kindercare_test_${process.pid}`;
    uri = u.toString();
  } else {
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    uri = repl.getUri('kindercare_test');
  }
  await mongoose.connect(uri);
  await mongoose.connection.db.dropDatabase(); // test luôn bắt đầu từ DB sạch
  return uri;
}

export async function teardownDB() {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  if (repl) await repl.stop();
}

// Khởi động app trên cổng ngẫu nhiên, trả về helper gọi HTTP
export async function startApp() {
  const app = (await import('../src/app.js')).default;
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}`;

  const call = async (method, path, { body, token, cookie, headers = {} } = {}) => {
    const h = { ...headers };
    if (body !== undefined) h['content-type'] = 'application/json';
    if (token) h.authorization = `Bearer ${token}`;
    if (cookie) h.cookie = cookie;
    const res = await fetch(base + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : await res.text();
    return { status: res.status, body: data, cookie: res.headers.get('set-cookie') };
  };

  return { base, call, close: () => new Promise((r) => srv.close(r)) };
}
