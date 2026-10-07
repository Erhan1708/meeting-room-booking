import { useCallback, useMemo } from 'react';

import { useSearchParams } from 'react-router';

export type QueryValue = string | number | boolean | undefined;

/**
 * Держит состояние фильтров/пагинации в query-строке.
 *
 * Тип каждого параметра выводится из значения по умолчанию, поэтому `defaults`
 * должен быть константой модуля, а не литералом внутри компонента.
 * Значения, равные умолчанию, из URL убираются — ссылка остаётся короткой.
 */
export function useQueryParams<T extends Record<string, QueryValue>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = useMemo(() => {
    const result = { ...defaults };

    for (const key of Object.keys(defaults)) {
      const raw = searchParams.get(key);
      if (raw === null) continue;

      const fallback = defaults[key];
      let parsed: QueryValue = raw;

      if (typeof fallback === 'number') {
        const asNumber = Number(raw);
        parsed = Number.isFinite(asNumber) ? asNumber : fallback;
      } else if (typeof fallback === 'boolean') {
        parsed = raw === 'true';
      }

      result[key as keyof T] = parsed as T[keyof T];
    }

    return result;
  }, [defaults, searchParams]);

  const setValues = useCallback(
    (patch: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '' || value === defaults[key]) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }

          return next;
        },
        { replace: true },
      );
    },
    [defaults, setSearchParams],
  );

  return [values, setValues] as const;
}
