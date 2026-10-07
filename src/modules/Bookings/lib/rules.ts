import type { Booking, BookingInput, IsoDate, OfficeNow, TimeHHmm } from '../model';
import {
  MAX_DURATION,
  MIN_DURATION,
  TIME_STEP,
  TITLE_MAX_LENGTH,
  WORK_DAY_END,
  WORK_DAY_START,
} from './constants';
import { isIsoDate, isTime, toMinutes, toTime } from './time';

/**
 * Бизнес-правила брони — чистые функции без React и сети.
 * Их используют и форма (подсказки до отправки), и mock-сервер (источник правды).
 */

export type BookingField = 'date' | 'start' | 'end' | 'title';
export type BookingFieldErrors = Partial<Record<BookingField, string>>;

type Interval = { start: number; end: number };

const toInterval = (b: Pick<Booking, 'start' | 'end'>): Interval => ({
  start: toMinutes(b.start),
  end: toMinutes(b.end),
});

/** Полуоткрытые интервалы [start, end): касание границ (10–11 и 11–12) пересечением не считается. */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Первая бронь того же дня, с которой пересекается `input`.
 * `excludeId` — редактируемая бронь: сама с собой она не конфликтует.
 */
export function findConflict(
  input: Pick<BookingInput, 'date' | 'start' | 'end'>,
  bookings: readonly Booking[],
  excludeId?: string,
): Booking | undefined {
  const target = toInterval(input);
  return bookings.find(
    (b) => b.id !== excludeId && b.date === input.date && intervalsOverlap(target, toInterval(b)),
  );
}

/** Прошедшая или уже начавшаяся бронь доступна только для просмотра. */
export function isBookingLocked(booking: Pick<Booking, 'date' | 'start'>, now: OfficeNow): boolean {
  if (booking.date !== now.date) return booking.date < now.date;
  return toMinutes(booking.start) <= now.minutes;
}

/** На прошедшую дату создавать брони нельзя. */
export function isPastDate(date: IsoDate, now: OfficeNow): boolean {
  return date < now.date;
}

/**
 * Проверка полей брони без учёта других броней.
 * Возвращает первую ошибку по каждому полю; пустой объект — всё в порядке.
 */
export function validateBookingFields(input: BookingInput, now: OfficeNow): BookingFieldErrors {
  const errors: BookingFieldErrors = {};

  if (!isIsoDate(input.date)) errors.date = 'Укажите дату в формате ГГГГ-ММ-ДД';
  else if (isPastDate(input.date, now)) errors.date = 'Нельзя бронировать прошедшую дату';

  if (input.title !== undefined && input.title.trim().length > TITLE_MAX_LENGTH) {
    errors.title = `Не длиннее ${TITLE_MAX_LENGTH} символов`;
  }

  if (!isTime(input.start)) errors.start = 'Укажите время начала';
  if (!isTime(input.end)) errors.end = 'Укажите время окончания';
  if (errors.start || errors.end) return errors;

  const start = toMinutes(input.start);
  const end = toMinutes(input.end);

  if (start % TIME_STEP !== 0) errors.start = `Время должно быть кратно ${TIME_STEP} минутам`;
  if (end % TIME_STEP !== 0) errors.end = `Время должно быть кратно ${TIME_STEP} минутам`;

  if (start < WORK_DAY_START || start >= WORK_DAY_END) {
    errors.start ??= `Начало — в пределах рабочего дня ${toTime(WORK_DAY_START)}–${toTime(WORK_DAY_END)}`;
  }
  if (end <= WORK_DAY_START || end > WORK_DAY_END) {
    errors.end ??= `Окончание — в пределах рабочего дня ${toTime(WORK_DAY_START)}–${toTime(WORK_DAY_END)}`;
  }

  if (!errors.start && !errors.end) {
    const duration = end - start;
    if (duration <= 0) errors.end = 'Окончание должно быть позже начала';
    else if (duration < MIN_DURATION)
      errors.end = `Минимальная длительность — ${MIN_DURATION} минут`;
    else if (duration > MAX_DURATION)
      errors.end = `Максимальная длительность — ${MAX_DURATION / 60} часа`;
  }

  if (!errors.date && !errors.start && input.date === now.date && start < now.minutes) {
    errors.start = 'Это время уже прошло';
  }

  return errors;
}

export type TimeOption = {
  value: TimeHHmm;
  disabled: boolean;
  /** Почему вариант недоступен — для подсказки. */
  reason?: string;
};

type SlotContext = {
  date: IsoDate;
  bookings: readonly Booking[];
  now: OfficeNow;
  excludeId?: string;
};

const othersOnDate = ({ date, bookings, excludeId }: SlotContext) =>
  bookings.filter((b) => b.date === date && b.id !== excludeId).map(toInterval);

/** Варианты времени начала с шагом сетки и причиной недоступности. */
export function getStartOptions(ctx: SlotContext): TimeOption[] {
  const others = othersOnDate(ctx);
  const options: TimeOption[] = [];

  for (let t = WORK_DAY_START; t <= WORK_DAY_END - MIN_DURATION; t += TIME_STEP) {
    let reason: string | undefined;

    if (isPastDate(ctx.date, ctx.now) || (ctx.date === ctx.now.date && t < ctx.now.minutes)) {
      reason = 'прошло';
    } else if (others.some((o) => intervalsOverlap({ start: t, end: t + MIN_DURATION }, o))) {
      reason = 'занято';
    }

    options.push({ value: toTime(t), disabled: Boolean(reason), reason });
  }

  return options;
}

/** Варианты окончания для выбранного начала: 30 мин – 2 ч, до конца дня и до следующей брони. */
export function getEndOptions(start: TimeHHmm, ctx: SlotContext): TimeOption[] {
  const from = toMinutes(start);
  const nextBusy = othersOnDate(ctx)
    .filter((o) => o.end > from)
    .reduce((min, o) => Math.min(min, Math.max(o.start, from)), WORK_DAY_END);
  const options: TimeOption[] = [];

  for (
    let t = from + MIN_DURATION;
    t <= Math.min(from + MAX_DURATION, WORK_DAY_END);
    t += TIME_STEP
  ) {
    const busy = t > nextBusy;
    options.push({ value: toTime(t), disabled: busy, reason: busy ? 'занято' : undefined });
  }

  return options;
}
