import { useState } from 'react';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';
import { Textarea } from './Textarea.jsx';

/**
 * Hộp thoại xác nhận. requireReason=true → bắt buộc nhập lý do (≥3 ký tự), truyền vào onConfirm(reason).
 * Nút nói đúng việc sẽ xảy ra: confirmLabel="Khoá tài khoản".
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Xác nhận', danger = false, requireReason = false, reasonLabel = 'Lý do' }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const close = () => {
    setReason('');
    setErr('');
    onClose?.();
  };

  const confirm = async () => {
    if (requireReason && reason.trim().length < 3) {
      setErr('Nhập lý do, tối thiểu 3 ký tự.');
      return;
    }
    setLoading(true);
    try {
      await onConfirm(reason.trim());
      close();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Huỷ
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={confirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-sm text-ink">{message}</p>}
      {requireReason && (
        <Textarea className="mt-3" label={reasonLabel} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} error={err} autoFocus />
      )}
    </Modal>
  );
}
