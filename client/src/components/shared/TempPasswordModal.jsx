import { useState } from 'react';
import { Copy, Check, TriangleAlert } from 'lucide-react';
import { Modal, Button } from '../ui/index.js';

// Hiện mật khẩu tạm ĐÚNG MỘT LẦN sau khi tạo tài khoản / đặt lại mật khẩu
export function TempPasswordModal({ open, onClose, user, password, title = 'Mật khẩu tạm' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* trình duyệt chặn clipboard → người dùng tự chọn */
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={user ? `${user.fullName} · ${user.email}` : ''}
      size="sm"
      footer={
        <Button onClick={onClose} className="w-full md:w-auto">
          Tôi đã lưu lại
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-paper px-4 py-3">
        <code className="select-all font-display text-2xl font-bold tracking-wider text-ink">{password}</code>
        <Button variant="secondary" size="sm" icon={copied ? Check : Copy} onClick={copy}>
          {copied ? 'Đã sao chép' : 'Sao chép'}
        </Button>
      </div>
      <p className="mt-3 flex items-start gap-2 text-sm text-ink-soft">
        <TriangleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[#8A6100]" aria-hidden />
        Mật khẩu này chỉ hiện một lần. Gửi cho người dùng qua kênh riêng; họ sẽ phải đổi mật khẩu ngay khi đăng nhập.
      </p>
    </Modal>
  );
}
