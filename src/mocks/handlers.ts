import { HttpResponse, delay, http } from 'msw';

import {
  findConflict,
  getOfficeNow,
  isBookingLocked,
  isIsoDate,
  validateBookingFields,
} from 'modules/Bookings/lib';
import type { Booking, BookingInput } from 'modules/Bookings/model';

import { db } from './db';
import { mockSettings } from './devtools';

/**
 * Mock-сервер по контракту из ТЗ. Он — источник правды: заново проверяет все
 * бизнес-правила и не доверяет клиенту. Формат ошибки:
 * `{ code, message, details?: { fieldErrors?, conflicting? } }`.
 */

type ErrorCode = 'VALIDATION_ERROR' | 'CONFLICT' | 'NOT_FOUND' | 'BOOKING_LOCKED' | 'INTERNAL';

const error = (status: number, code: ErrorCode, message: string, details?: object) =>
  HttpResponse.json({ code, message, details }, { status });

const OTHER_USER_TITLE = 'Бронь другого сотрудника';

/** Из произвольного тела запроса берём только известные поля; пустое название — его отсутствие. */
async function readInput(request: Request, base?: Booking): Promise<BookingInput | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  if (typeof body !== 'object' || body === null) return null;

  const b = body as Partial<Record<keyof BookingInput, unknown>>;
  const pick = <K extends keyof BookingInput>(key: K) => (key in b ? b[key] : base?.[key]);
  const title = typeof pick('title') === 'string' ? (pick('title') as string).trim() : undefined;

  return {
    date: String(pick('date') ?? ''),
    start: String(pick('start') ?? ''),
    end: String(pick('end') ?? ''),
    ...(title ? { title } : {}),
  };
}

/** Общая часть POST и PATCH: валидация полей и проверка пересечений. */
function validate(input: BookingInput, excludeId?: string) {
  const fieldErrors = validateBookingFields(input, getOfficeNow());
  if (Object.keys(fieldErrors).length > 0) {
    return error(422, 'VALIDATION_ERROR', 'Проверьте правильность заполнения полей.', {
      fieldErrors,
    });
  }

  // Имитация гонки: пока пользователь заполнял форму, слот занял кто-то другой.
  if (mockSettings.consume('conflictNext')) {
    const { date, start, end } = input;
    db.insert({ date, start, end, title: OTHER_USER_TITLE });
  }

  const conflicting = findConflict(input, db.all(), excludeId);
  if (conflicting) {
    return error(
      409,
      'CONFLICT',
      `Время ${conflicting.start}–${conflicting.end} уже занято. Выберите другой интервал.`,
      { conflicting },
    );
  }

  return null;
}

const lockedError = () =>
  error(422, 'BOOKING_LOCKED', 'Бронь уже началась или прошла — её нельзя изменить или удалить.');

const notFound = () => error(404, 'NOT_FOUND', 'Бронь не найдена — возможно, её уже удалили.');

export const handlers = [
  // Общая «сеть»: задержка и одноразовая ошибка сервера для любого запроса к API.
  http.all('*/api/*', async () => {
    await delay(mockSettings.get().latency);
    if (mockSettings.consume('failNext')) {
      return error(500, 'INTERNAL', 'Сервер временно недоступен. Попробуйте ещё раз.');
    }
    return undefined;
  }),

  http.get('*/api/bookings', ({ request }) => {
    const date = new URL(request.url).searchParams.get('date');
    if (!isIsoDate(date)) {
      return error(400, 'VALIDATION_ERROR', 'Параметр date обязателен в формате YYYY-MM-DD.');
    }
    return HttpResponse.json(db.byDate(date));
  }),

  http.post('*/api/bookings', async ({ request }) => {
    const input = await readInput(request);
    if (!input) return error(400, 'VALIDATION_ERROR', 'Некорректное тело запроса.');

    const failure = validate(input);
    if (failure) return failure;

    return HttpResponse.json(db.insert(input), { status: 201 });
  }),

  http.patch<{ id: string }>('*/api/bookings/:id', async ({ request, params }) => {
    const existing = db.find(params.id);
    if (!existing) return notFound();
    if (isBookingLocked(existing, getOfficeNow())) return lockedError();

    const input = await readInput(request, existing);
    if (!input) return error(400, 'VALIDATION_ERROR', 'Некорректное тело запроса.');

    const failure = validate(input, existing.id);
    if (failure) return failure;

    const updated: Booking = { id: existing.id, ...input };
    db.replace(updated);
    return HttpResponse.json(updated);
  }),

  http.delete<{ id: string }>('*/api/bookings/:id', ({ params }) => {
    const existing = db.find(params.id);
    if (!existing) return notFound();
    if (isBookingLocked(existing, getOfficeNow())) return lockedError();

    db.remove(existing.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
