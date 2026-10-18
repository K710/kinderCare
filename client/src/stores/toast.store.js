import { create } from 'zustand';

let seq = 0;

// toast.success('Đã lưu điểm danh') – dùng cùng từ với nút
export const useToastStore = create((set) => ({
  items: [],
  push: (toast) => {
    const id = ++seq;
    set((s) => ({ items: [...s.items, { id, duration: 3500, ...toast }] }));
    return id;
  },
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

const push = (type) => (message, opts = {}) => useToastStore.getState().push({ type, message, ...opts });

export const toast = {
  success: push('success'),
  error: push('error'),
  info: push('info'),
  warning: push('warning'),
};
