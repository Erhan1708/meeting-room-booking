import { Tag } from 'antd';

import { toMinutes } from '../lib';
import type { Booking, OfficeNow } from '../model';

export type BookingPhase = 'upcoming' | 'ongoing' | 'past';

export function getBookingPhase(b: Booking, now: OfficeNow): BookingPhase {
  if (b.date !== now.date) return b.date < now.date ? 'past' : 'upcoming';
  if (toMinutes(b.end) <= now.minutes) return 'past';
  if (toMinutes(b.start) <= now.minutes) return 'ongoing';
  return 'upcoming';
}

export function BookingStatus({ phase }: { phase: BookingPhase }) {
  if (phase === 'ongoing') return <Tag color="green">Идёт сейчас</Tag>;
  if (phase === 'past') return <Tag>Прошла</Tag>;
  return null;
}
