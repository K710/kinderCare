import { useCallback, useState } from 'react';

// Trạng thái phân trang + bộ lọc; đổi bộ lọc thì về trang 1
export function usePagination(initialFilters = {}, limit = 20) {
  const [page, setPage] = useState(1);
  const [filters, setFiltersState] = useState(initialFilters);

  const setFilters = useCallback((patch) => {
    setFiltersState((f) => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }));
    setPage(1);
  }, []);

  // Tham số gửi API, bỏ giá trị rỗng
  const params = Object.fromEntries(Object.entries({ page, limit, ...filters }).filter(([, v]) => v !== '' && v != null));
  return { page, setPage, filters, setFilters, params, limit };
}
