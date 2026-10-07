import type { IsoDate, OfficeNow, TimeHHmm } from '../model';
import { OFFICE_TIME_ZONE, TIME_STEP } from './constants';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isTime(value: unknown): value is TimeHHmm {
  return typeof value === 'string' && TIME_RE.test(value);
}

/** Строгая проверка: формат и существующая календарная дата (без 2026-02-30). */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function toMinutes(time: TimeHHmm): number {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

export function toTime(minutes: number): TimeHHmm {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Округление вверх до шага сетки: в 10:10 первое доступное время — 10:15. */
export function ceilToStep(minutes: number, step = TIME_STEP): number {
  return Math.ceil(minutes / step) * step;
}

/** Сдвиг даты на N дней без участия часового пояса браузера. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const officeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: OFFICE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Текущие дата и время в часовом поясе офиса. */
export function getOfficeNow(instant: Date = new Date()): OfficeNow {
  const parts = Object.fromEntries(
    officeFormatter.formatToParts(instant).map((p) => [p.type, p.value]),
  ) as Record<Intl.DateTimeFormatPartTypes, string>;

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** День недели: 0 — понедельник … 6 — воскресенье. */
export function weekdayIndex(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Семь дат недели (пн–вс), в которую входит `date`. */
export function weekDates(date: IsoDate): IsoDate[] {
  const monday = addDays(date, -weekdayIndex(date));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
