import type { Booking, BookingInput, OfficeNow } from '../model';
import {
  findConflict,
  getEndOptions,
  getStartOptions,
  intervalsOverlap,
  isBookingLocked,
  validateBookingFields,
} from './rules';
import { addDays, ceilToStep, getOfficeNow, isIsoDate, weekDates, weekdayIndex } from './time';

const TODAY = '2026-10-07';
const TOMORROW = '2026-10-08';
const NOW: OfficeNow = { date: TODAY, minutes: 10 * 60 + 10 }; // 10:10

const booking = (id: string, start: string, end: string, date = TOMORROW): Booking => ({
  id,
  date,
  start,
  end,
});

const input = (start: string, end: string, date = TOMORROW): BookingInput => ({
  date,
  start,
  end,
});

describe('intervalsOverlap', () => {
  it('касание границ не считается пересечением', () => {
    expect(intervalsOverlap({ start: 600, end: 660 }, { start: 660, end: 720 })).toBe(false);
    expect(intervalsOverlap({ start: 660, end: 720 }, { start: 600, end: 660 })).toBe(false);
  });

  it('частичное и полное вложение — пересечение', () => {
    expect(intervalsOverlap({ start: 600, end: 690 }, { start: 660, end: 720 })).toBe(true);
    expect(intervalsOverlap({ start: 600, end: 720 }, { start: 630, end: 660 })).toBe(true);
  });
});

describe('findConflict', () => {
  const bookings = [booking('a', '10:00', '11:00'), booking('b', '12:00', '13:00', TODAY)];

  it('находит пересечение в тот же день', () => {
    expect(findConflict(input('10:30', '11:30'), bookings)?.id).toBe('a');
  });

  it('не видит конфликта на стыке и в другой день', () => {
    expect(findConflict(input('11:00', '12:00'), bookings)).toBeUndefined();
    expect(findConflict(input('12:00', '13:00'), bookings)).toBeUndefined();
  });

  it('редактируемая бронь не конфликтует сама с собой', () => {
    expect(findConflict(input('10:15', '11:15'), bookings, 'a')).toBeUndefined();
  });
});

describe('validateBookingFields', () => {
  it('корректная бронь проходит', () => {
    expect(validateBookingFields(input('09:00', '11:00'), NOW)).toEqual({});
    expect(validateBookingFields(input('17:30', '18:00'), NOW)).toEqual({});
  });

  it('границы рабочего дня', () => {
    expect(validateBookingFields(input('08:45', '09:30'), NOW).start).toMatch(/рабочего дня/);
    expect(validateBookingFields(input('17:30', '18:15'), NOW).end).toMatch(/рабочего дня/);
  });

  it('start < end', () => {
    expect(validateBookingFields(input('11:00', '11:00'), NOW).end).toMatch(/позже начала/);
    expect(validateBookingFields(input('12:00', '11:00'), NOW).end).toMatch(/позже начала/);
  });

  it('длительность от 30 минут до 2 часов', () => {
    expect(validateBookingFields(input('10:00', '10:15'), NOW).end).toMatch(/30 минут/);
    expect(validateBookingFields(input('10:00', '12:15'), NOW).end).toMatch(/2 часа/);
    expect(validateBookingFields(input('10:00', '10:30'), NOW)).toEqual({});
    expect(validateBookingFields(input('10:00', '12:00'), NOW)).toEqual({});
  });

  it('прошедшее время сегодня и прошедшая дата', () => {
    expect(validateBookingFields(input('10:00', '11:00', TODAY), NOW).start).toMatch(/прошло/);
    expect(validateBookingFields(input('10:15', '11:00', TODAY), NOW)).toEqual({});
    expect(validateBookingFields(input('10:00', '11:00', '2026-10-06'), NOW).date).toMatch(
      /прошедшую/,
    );
  });

  it('формат, шаг сетки и длина названия', () => {
    expect(validateBookingFields(input('9:00', '10:00'), NOW).start).toBeDefined();
    expect(validateBookingFields(input('10:05', '11:00'), NOW).start).toMatch(/кратно/);
    expect(validateBookingFields(input('10:00', '11:00', '2026-02-30'), NOW).date).toBeDefined();
    expect(
      validateBookingFields({ ...input('10:00', '11:00'), title: 'x'.repeat(101) }, NOW).title,
    ).toBeDefined();
  });
});

describe('isBookingLocked', () => {
  it('прошедшие и уже начавшиеся брони — только просмотр', () => {
    expect(isBookingLocked({ date: '2026-10-06', start: '17:00' }, NOW)).toBe(true);
    expect(isBookingLocked({ date: TODAY, start: '10:00' }, NOW)).toBe(true);
    expect(isBookingLocked({ date: TODAY, start: '10:10' }, NOW)).toBe(true);
    expect(isBookingLocked({ date: TODAY, start: '10:15' }, NOW)).toBe(false);
    expect(isBookingLocked({ date: TOMORROW, start: '09:00' }, NOW)).toBe(false);
  });
});

describe('getStartOptions / getEndOptions', () => {
  const bookings = [booking('a', '10:00', '11:00'), booking('b', '11:45', '12:30')];
  const ctx = { date: TOMORROW, bookings, now: NOW };

  it('начало: занятые слоты и слоты, куда не влезает 30 минут, недоступны', () => {
    const opts = Object.fromEntries(getStartOptions(ctx).map((o) => [o.value, o.disabled]));
    expect(opts['09:30']).toBe(false);
    expect(opts['09:45']).toBe(true); // 09:45–10:15 залезает на бронь a
    expect(opts['10:30']).toBe(true);
    expect(opts['11:00']).toBe(false);
    expect(opts['11:30']).toBe(true); // до b всего 15 минут
    expect(opts['17:30']).toBe(false);
    expect(opts['17:45']).toBeUndefined(); // до конца дня меньше 30 минут
  });

  it('сегодня прошедшие слоты недоступны (округление вверх до шага)', () => {
    const opts = getStartOptions({ ...ctx, date: TODAY, bookings: [] });
    expect(opts.find((o) => !o.disabled)?.value).toBe('10:15');
  });

  it('окончание: не дальше следующей брони и не больше 2 часов', () => {
    expect(
      getEndOptions('11:00', ctx)
        .filter((o) => !o.disabled)
        .map((o) => o.value),
    ).toEqual(['11:30', '11:45']);
    expect(getEndOptions('16:30', ctx).map((o) => o.value)).toEqual([
      '17:00',
      '17:15',
      '17:30',
      '17:45',
      '18:00',
    ]);
  });

  it('при редактировании своя бронь не мешает', () => {
    const ends = getEndOptions('10:00', { ...ctx, excludeId: 'a' }).filter((o) => !o.disabled);
    expect(ends.map((o) => o.value)).toContain('11:45');
  });
});

describe('time helpers', () => {
  it('getOfficeNow считает в Asia/Bishkek (UTC+6)', () => {
    expect(getOfficeNow(new Date('2026-10-07T20:30:00Z'))).toEqual({
      date: '2026-10-08',
      minutes: 2 * 60 + 30,
    });
  });

  it('addDays, ceilToStep, isIsoDate', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(ceilToStep(610)).toBe(615);
    expect(ceilToStep(615)).toBe(615);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
  });

  it('weekDates: неделя с понедельника, переход через месяц', () => {
    expect(weekdayIndex('2026-10-07')).toBe(2); // среда
    expect(weekDates('2026-10-07')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    expect(weekDates('2026-11-01')[0]).toBe('2026-10-26'); // воскресенье → понедельник прошлой недели
  });
});
