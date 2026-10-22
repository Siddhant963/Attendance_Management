import { useCallback, useState } from 'react';

/**
 * Filter and page state for a paginated list. Changing a filter returns to page 1, and empty filters
 * are left out of `params`, which is ready to pass to an RTK Query endpoint.
 */
export function useFilters(initial, limit = 10) {
  const [filters, setFilters] = useState(initial);
  const [page, setPage] = useState(1);

  const set = useCallback((key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }, []);
  const bind = (key) => ({ value: filters[key], onChange: (e) => set(key, e.target.value) });
  const params = { page, limit, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };

  return { filters, params, page, setPage, set, bind };
}
