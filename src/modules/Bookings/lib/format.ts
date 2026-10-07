import dayjs from 'dayjs';

import type { Booking, IsoDate } from '../model';

export const formatDateLong = (date: IsoDate): string => dayjs(date).format('dddd, D MMMM YYYY');

export const formatRange = (b: Pick<Booking, 'start' | 'end'>): string => `${b.start}–${b.end}`;

export const bookingLabel = (b: Booking): string =>
  b.title ? `${formatRange(b)} «${b.title}»` : formatRange(b);
