import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api/axios.js';

/**
 * useFetch(() => api.list(params), [params]) → { data, loading, error, reload, setData }
 * Bỏ qua kết quả của lần gọi cũ khi deps đổi nhanh (tránh race).
 */
export function useFetch(fetcher, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const run = useCallback(async () => {
    if (!enabled) return;
    const id = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const res = await fetcher();
      if (id === seq.current) setData(res);
    } catch (err) {
      if (id === seq.current) setError(errorMessage(err));
    } finally {
      if (id === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, reload: run, setData };
}

// Trì hoãn giá trị (ô tìm kiếm)
export function useDebounce(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
