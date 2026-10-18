import { useEffect } from 'react';
import { classApi } from '../api/class.api.js';
import { useFetch } from './useFetch.js';
import { useUiStore } from '../stores/ui.store.js';

/**
 * Lớp của giáo viên đang đăng nhập + lớp đang chọn (nhớ trong ui.store).
 * → { classes, loading, error, selected, selectedId, select }
 */
export function useMyClasses() {
  const { data, loading, error, reload } = useFetch(() => classApi.list({ limit: 20 }).then((r) => r.data), []);
  const selectedId = useUiStore((s) => s.selectedClassId);
  const select = useUiStore((s) => s.setSelectedClass);
  const classes = data || [];

  // Tự chọn lớp đầu tiên nếu chưa chọn hoặc lớp đã chọn không còn
  useEffect(() => {
    if (!classes.length) return;
    if (!selectedId || !classes.some((c) => c._id === selectedId)) select(classes[0]._id);
  }, [classes, selectedId, select]);

  const selected = classes.find((c) => c._id === selectedId) || null;
  return { classes, loading, error, reload, selected, selectedId: selected?._id || '', select };
}
