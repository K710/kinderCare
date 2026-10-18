import crypto from 'crypto';

// Bỏ ký tự dễ nhầm (0/O, 1/I) để phụ huynh gõ nội dung chuyển khoản không sai
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// Mã thanh toán học phí: HP + 8 ký tự [A-Z0-9]
export const paymentCode = () => `HP${randomCode(8)}`;
export const PAYMENT_CODE_REGEX = /HP[A-Z0-9]{8}/g;
