import { addDays, getOfficeNow } from 'modules/Bookings/lib';
import type { Booking } from 'modules/Bookings/model';

/**
 * Хранилище mock-сервера. Каждый запрос читает localStorage заново, а не держит
 * копию в памяти: тогда две вкладки работают с общими данными, и конфликт 409
 * можно воспроизвести честно — забронировать один слот из обеих.
 */

const STORAGE_KEY = 'mrb:bookings:v1';

function seed(): Booking[] {
  const today = getOfficeNow().date;
  const tomorrow = addDays(today, 1);
  return [
    { id: crypto.randomUUID(), date: today, start: '09:00', end: '09:30', title: 'Планёрка' },
    {
      id: crypto.randomUUID(),
      date: today,
      start: '14:00',
      end: '15:30',
      title: 'Созвон с клиентом',
    },
    { id: crypto.randomUUID(), date: tomorrow, start: '10:00', end: '11:00', title: 'Ретро' },
    {
      id: crypto.randomUUID(),
      date: tomorrow,
      start: '11:00',
      end: '12:00',
      title: 'Собеседование',
    },
  ];
}

function read(): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Booking[];
    }
  } catch {
    // Повреждённые данные или недоступный storage — начинаем с демо-набора.
  }
  const initial = seed();
  write(initial);
  return initial;
}

function write(bookings: Booking[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    // Приватный режим / переполнение: работаем без сохранения.
  }
}

const byStart = (a: Booking, b: Booking) => a.start.localeCompare(b.start);

export const db = {
  all: (): Booking[] => read(),

  byDate: (date: string): Booking[] =>
    read()
      .filter((b) => b.date === date)
      .sort(byStart),

  find: (id: string): Booking | undefined => read().find((b) => b.id === id),

  insert(data: Omit<Booking, 'id'>): Booking {
    const booking: Booking = { id: crypto.randomUUID(), ...data };
    write([...read(), booking]);
    return booking;
  },

  replace(booking: Booking): void {
    write(read().map((b) => (b.id === booking.id ? booking : b)));
  },

  remove(id: string): void {
    write(read().filter((b) => b.id !== id));
  },

  reset(): void {
    write(seed());
  },
};
