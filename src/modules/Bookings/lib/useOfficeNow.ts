import { useEffect, useState } from 'react';

import type { OfficeNow } from '../model';
import { getOfficeNow } from './time';

const TICK_MS = 30_000;

/** «Сейчас» в поясе офиса, обновляется раз в 30 секунд — прошедшие слоты гаснут сами. */
export function useOfficeNow(): OfficeNow {
  const [now, setNow] = useState(getOfficeNow);

  useEffect(() => {
    const id = setInterval(() => {
      const next = getOfficeNow();
      setNow((prev) => (prev.date === next.date && prev.minutes === next.minutes ? prev : next));
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return now;
}
