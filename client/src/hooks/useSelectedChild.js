import { useAuth } from './useAuth.js';
import { useUiStore } from '../stores/ui.store.js';

// Bé đang chọn của phụ huynh (danh sách con lấy từ /auth/me, chọn ở ChildSwitcher)
export function useSelectedChild() {
  const { user } = useAuth();
  const children = user?.children || [];
  const selectedId = useUiStore((s) => s.selectedChildId);
  const child = children.find((c) => c._id === selectedId) || children[0] || null;
  return { child, children, childId: child?._id || '' };
}
