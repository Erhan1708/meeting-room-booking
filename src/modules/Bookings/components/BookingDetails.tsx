import { Button, Descriptions } from 'antd';
import { useGlobalModal } from 'shared';

import { formatDateLong, formatRange } from '../lib';
import type { Booking } from '../model';

/** Прошедшая или уже начавшаяся бронь — только просмотр. */
export function BookingDetails({ booking }: { booking: Booking }) {
  const { closeModal } = useGlobalModal();

  return (
    <div className="space-y-4">
      <Descriptions
        column={1}
        size="small"
        items={[
          { key: 'date', label: 'Дата', children: formatDateLong(booking.date) },
          { key: 'time', label: 'Время', children: formatRange(booking) },
          { key: 'title', label: 'Название', children: booking.title || '—' },
        ]}
      />
      <p className="text-sm text-muted">
        Бронь уже началась или прошла, поэтому её нельзя изменить или удалить.
      </p>
      <Button block size="large" onClick={closeModal}>
        Закрыть
      </Button>
    </div>
  );
}
