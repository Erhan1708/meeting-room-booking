import type { Booking } from 'modules/Bookings/model';

import { mockSettings } from './devtools';

// 2026-10-07 10:00 по Бишкеку (UTC+6).
const NOW = new Date('2026-10-07T04:00:00Z');
const TODAY = '2026-10-07';
const NEXT_WEEK = '2026-10-14';
const API = 'http://localhost/api/bookings';

const json = (method: string, body: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const create = (body: Partial<Booking>) => fetch(API, json('POST', body));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('mock API /api/bookings', () => {
  it('GET требует корректную дату и отдаёт брони дня по времени начала', async () => {
    expect((await fetch(`${API}?date=2026-13-01`)).status).toBe(400);

    await create({ date: NEXT_WEEK, start: '15:00', end: '16:00' });
    await create({ date: NEXT_WEEK, start: '09:00', end: '10:00' });
    const list = (await (await fetch(`${API}?date=${NEXT_WEEK}`)).json()) as Booking[];
    expect(list.map((b) => b.start)).toEqual(['09:00', '15:00']);
  });

  it('POST: 201, валидация 422 с ошибками полей, касание границ допустимо', async () => {
    const ok = await create({ date: NEXT_WEEK, start: '10:00', end: '11:00', title: '  Ретро ' });
    expect(ok.status).toBe(201);
    expect(((await ok.json()) as Booking).title).toBe('Ретро');

    expect((await create({ date: NEXT_WEEK, start: '11:00', end: '12:00' })).status).toBe(201);

    const invalid = await create({ date: NEXT_WEEK, start: '12:00', end: '15:00' });
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { fieldErrors: { end: expect.stringMatching(/2 часа/) } },
    });

    const past = await create({ date: TODAY, start: '09:30', end: '10:30' });
    expect(past.status).toBe(422);
  });

  it('POST: пересечение → 409 с конфликтующей бронью', async () => {
    await create({ date: NEXT_WEEK, start: '10:00', end: '11:00' });
    const res = await create({ date: NEXT_WEEK, start: '10:30', end: '11:30' });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      code: 'CONFLICT',
      details: { conflicting: { start: '10:00', end: '11:00' } },
    });
  });

  it('PATCH: бронь не конфликтует сама с собой; 404 для удалённой', async () => {
    const created = (await (
      await create({ date: NEXT_WEEK, start: '10:00', end: '11:00' })
    ).json()) as Booking;

    const moved = await fetch(
      `${API}/${created.id}`,
      json('PATCH', { start: '10:30', end: '11:30' }),
    );
    expect(moved.status).toBe(200);
    expect(await moved.json()).toMatchObject({ id: created.id, start: '10:30', end: '11:30' });

    expect((await fetch(`${API}/${created.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await fetch(`${API}/${created.id}`, json('PATCH', { title: 'x' }))).status).toBe(404);
  });

  it('уже начавшуюся бронь нельзя изменить или удалить', async () => {
    vi.setSystemTime(new Date('2026-10-07T03:00:00Z')); // 09:00
    const created = (await (
      await create({ date: TODAY, start: '09:30', end: '10:30' })
    ).json()) as Booking;
    vi.setSystemTime(NOW); // 10:00 — бронь идёт

    const patch = await fetch(`${API}/${created.id}`, json('PATCH', { end: '11:00' }));
    expect(patch.status).toBe(422);
    expect(await patch.json()).toMatchObject({ code: 'BOOKING_LOCKED' });
    expect((await fetch(`${API}/${created.id}`, { method: 'DELETE' })).status).toBe(422);
  });

  it('dev-флаги: конфликт «другого пользователя» и одноразовая ошибка 500', async () => {
    mockSettings.set({ conflictNext: true });
    const res = await create({ date: NEXT_WEEK, start: '13:00', end: '14:00' });
    expect(res.status).toBe(409);
    expect(mockSettings.get().conflictNext).toBe(false);

    mockSettings.set({ failNext: true });
    expect((await fetch(`${API}?date=${NEXT_WEEK}`)).status).toBe(500);
    expect((await fetch(`${API}?date=${NEXT_WEEK}`)).status).toBe(200);
  });
});
