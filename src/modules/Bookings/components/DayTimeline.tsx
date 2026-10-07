import { cn } from 'shared';

import {
  TIME_STEP,
  WORK_DAY_END,
  WORK_DAY_START,
  formatRange,
  getStartOptions,
  isBookingLocked,
  toMinutes,
  toTime,
} from '../lib';
import type { Booking, IsoDate, OfficeNow, TimeHHmm } from '../model';

const ROW_HEIGHT = 18; // px на один шаг сетки (15 минут)
const ROWS = (WORK_DAY_END - WORK_DAY_START) / TIME_STEP;
const HOURS = Array.from(
  { length: (WORK_DAY_END - WORK_DAY_START) / 60 + 1 },
  (_, i) => WORK_DAY_START + i * 60,
);

const offset = (minutes: number) => ((minutes - WORK_DAY_START) / TIME_STEP) * ROW_HEIGHT;

type Props = {
  date: IsoDate;
  bookings: Booking[];
  now: OfficeNow;
  onCreate: (start: TimeHHmm) => void;
  onOpen: (booking: Booking) => void;
};

/**
 * Визуальная шкала дня для мыши: клик по свободному месту — новая бронь с этим началом.
 * Для клавиатуры и скринридеров та же информация и действия есть в списке,
 * поэтому шкала скрыта из дерева доступности, а её кнопки — из порядка табуляции.
 */
export function DayTimeline({ date, bookings, now, onCreate, onOpen }: Props) {
  const startOptions = getStartOptions({ date, bookings, now });
  const showNow = date === now.date && now.minutes >= WORK_DAY_START && now.minutes <= WORK_DAY_END;

  return (
    <div aria-hidden="true" className="relative flex select-none">
      <div className="relative w-14 shrink-0" style={{ height: ROWS * ROW_HEIGHT }}>
        {HOURS.map((h) => (
          <span
            key={h}
            className="absolute right-2 -translate-y-1/2 text-xs text-muted tabular-nums"
            style={{ top: offset(h) }}
          >
            {toTime(h)}
          </span>
        ))}
      </div>

      <div className="relative flex-1 border-t border-border" style={{ height: ROWS * ROW_HEIGHT }}>
        {startOptions.map((o) => (
          <button
            key={o.value}
            type="button"
            tabIndex={-1}
            disabled={o.disabled}
            onClick={() => onCreate(o.value)}
            title={o.disabled ? undefined : `Забронировать с ${o.value}`}
            aria-label={`${o.value}${o.reason ? `, ${o.reason}` : ''}`}
            className={cn(
              'absolute inset-x-0 block w-full border-0 bg-transparent p-0',
              toMinutes(o.value) % 60 === 45
                ? 'border-b border-solid border-border'
                : 'border-b border-dashed border-gray-100',
              o.disabled
                ? o.reason === 'прошло' && 'cursor-not-allowed bg-locked/70'
                : 'cursor-pointer hover:bg-busy',
            )}
            style={{ top: offset(toMinutes(o.value)), height: ROW_HEIGHT }}
          />
        ))}

        {bookings.map((b) => {
          const start = toMinutes(b.start);
          const end = toMinutes(b.end);
          const locked = isBookingLocked(b, now);
          return (
            <button
              key={b.id}
              type="button"
              tabIndex={-1}
              onClick={() => onOpen(b)}
              className={cn(
                'absolute inset-x-1 z-10 overflow-hidden rounded-md border border-solid px-2 py-0.5 text-left text-xs shadow-sm transition-shadow hover:shadow-md',
                locked
                  ? 'border-gray-300 bg-locked text-gray-500'
                  : 'border-indigo-300 bg-busy text-indigo-900',
              )}
              style={{ top: offset(start) + 1, height: offset(end) - offset(start) - 2 }}
            >
              <span className="font-semibold tabular-nums">{formatRange(b)}</span>
              {b.title && <span className="ml-2 truncate">{b.title}</span>}
            </button>
          );
        })}

        {showNow && (
          <div
            className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-solid border-red-500"
            style={{ top: offset(now.minutes) }}
          />
        )}
      </div>
    </div>
  );
}
