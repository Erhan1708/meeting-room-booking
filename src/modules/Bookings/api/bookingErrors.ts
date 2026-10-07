import { normalizeApiError } from 'shared/store';
import type { NormalizedError } from 'shared/store';

import { isIsoDate, isTime } from '../lib';
import type { Booking } from '../model';

export type BookingApiError = NormalizedError & {
  /** При 409 сервер присылает бронь, с которой случился конфликт. */
  conflicting?: Booking;
};

const isBooking = (v: unknown): v is Booking =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Booking).id === 'string' &&
  isIsoDate((v as Booking).date) &&
  isTime((v as Booking).start) &&
  isTime((v as Booking).end);

export function toBookingApiError(error: unknown): BookingApiError {
  const normalized = normalizeApiError(error);
  const conflicting = normalized.details?.conflicting;
  return isBooking(conflicting) ? { ...normalized, conflicting } : normalized;
}
