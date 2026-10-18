// Gửi webhook SePay mẫu tới server (mô phỏng nút "Gửi thử" của SePay).
// npm run sepay:test -- --code HPXXXXXXXX --amount 2500000 [--url http://localhost:5000/api/v1/payments/sepay-webhook] [--key ...] [--type in|out]
import 'dotenv/config';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
  }
  return out;
}

const a = parseArgs(process.argv.slice(2));
const url = a.url || `http://localhost:${process.env.PORT || 5000}/api/v1/payments/sepay-webhook`;
const key = a.key || process.env.SEPAY_WEBHOOK_KEY;
if (!key) {
  console.error('❌ Thiếu --key hoặc SEPAY_WEBHOOK_KEY trong .env');
  process.exit(1);
}

// Đúng format body SePay (docs.sepay.vn/tich-hop-webhooks.html)
const body = {
  id: Number(a.id) || Date.now() % 1e9,
  gateway: a.gateway || 'MBBank',
  transactionDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
  accountNumber: process.env.SEPAY_ACCOUNT || '0123456789',
  subAccount: null,
  code: a.code || null,
  content: a.content ?? (a.code ? `${a.code} hoc phi` : 'chuyen khoan khong ma'),
  transferType: a.type || 'in',
  description: 'Webhook test',
  transferAmount: Number(a.amount) || 100000,
  accumulated: 0,
  referenceCode: `TEST${Date.now()}`,
};

console.log('→ POST', url);
console.log(JSON.stringify(body, null, 2));
const res = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Apikey ${key}` },
  body: JSON.stringify(body),
});
const text = await res.text();
console.log('←', res.status, text);
process.exit(res.ok ? 0 : 1);
