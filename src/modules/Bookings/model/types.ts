/** Дата в формате `YYYY-MM-DD`. */
export type IsoDate = string;

/** Время в формате `HH:mm`. */
export type TimeHHmm = string;

/** Бронь в том виде, в каком её отдаёт API (контракт из ТЗ). */
export type Booking = {
  id: string;
  date: IsoDate;
  start: TimeHHmm;
  end: TimeHHmm;
  title?: string;
};

/** Тело POST/PATCH: всё, кроме идентификатора. */
export type BookingInput = Omit<Booking, 'id'>;

/** «Сейчас» в часовом поясе офиса. */
export type OfficeNow = {
  date: IsoDate;
  /** Минуты от начала суток. */
  minutes: number;
};
