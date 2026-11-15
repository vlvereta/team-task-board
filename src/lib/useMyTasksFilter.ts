import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** "My tasks" filter, kept in the URL (`#/board?mine=1`) so it survives reloads. */
export function useMyTasksFilter(): [boolean, (on: boolean) => void] {
  const [params, setParams] = useSearchParams();
  const on = params.get('mine') === '1';
  const set = useCallback(
    (next: boolean) => {
      setParams(
        (p) => {
          const copy = new URLSearchParams(p);
          if (next) copy.set('mine', '1');
          else copy.delete('mine');
          return copy;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return [on, set];
}
