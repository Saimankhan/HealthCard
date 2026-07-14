"use client";

import { useEffect, useState } from "react";

import { apiFetchWithMeta } from "@/lib/api-client";

/**
 * Shared debounced-filter-to-server-fetch pattern used by the admin list
 * pages (patients/doctors/appointments/payments/users/...). A filter value
 * of `""` or `"ALL"` is treated as "unset" and omitted from the query
 * string, matching the `<Select>` sentinel convention used across those
 * pages.
 */
export function useListQuery<TItem, TFilters extends Record<string, string>>({
  endpoint,
  filters,
  baseParams,
  debounceMs = 300,
}: {
  endpoint: string;
  filters: TFilters;
  baseParams?: Record<string, string>;
  debounceMs?: number;
}) {
  const [items, setItems] = useState<TItem[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setItems((prev) => (reloadKey === 0 ? null : prev));

    const timeout = setTimeout(async () => {
      const params = new URLSearchParams(baseParams);
      for (const [key, value] of Object.entries(filters)) {
        if (value && value !== "ALL") params.set(key, value);
      }

      try {
        const { data } = await apiFetchWithMeta<TItem[]>(
          `${endpoint}?${params.toString()}`
        );
        if (!cancelled) {
          setItems(data);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setError(true);
        }
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, filtersKey, reloadKey, debounceMs]);

  return {
    items,
    error,
    reload: () => setReloadKey((key) => key + 1),
  };
}
