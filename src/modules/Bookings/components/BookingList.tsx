import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { cn } from 'shared';

import { formatRange, isBookingLocked } from '../lib';
import type { Booking, OfficeNow } from '../model';
import { BookingStatus, getBookingPhase } from './BookingStatus';

type Props = {
  bookings: Booking[];
  now: OfficeNow;
  onOpen: (booking: Booking) => void;
  onDelete: (booking: Booking) => void;
};

/** Основное (и доступное с клавиатуры/скринридера) представление броней дня. */
export function BookingList({ bookings, now, onOpen, onDelete }: Props) {
  return (
    <ul className="divide-y divide-border" aria-label="Брони на выбранную дату">
      {bookings.map((b) => {
        const locked = isBookingLocked(b, now);
        const phase = getBookingPhase(b, now);
        const name = b.title || 'Без названия';

        return (
          <li key={b.id} className={cn('flex items-center gap-3 px-1 py-3 transition-colors')}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold tabular-nums">{formatRange(b)}</span>
                <BookingStatus phase={phase} />
              </div>
              <div className={cn('truncate text-sm', b.title ? 'text-gray-700' : 'text-muted')}>
                {name}
              </div>
            </div>

            {locked ? (
              <Tooltip title="Просмотр">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  aria-label={`Просмотреть бронь ${formatRange(b)}`}
                  onClick={() => onOpen(b)}
                />
              </Tooltip>
            ) : (
              <div className="flex shrink-0 gap-1">
                <Tooltip title="Изменить">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    aria-label={`Изменить бронь ${formatRange(b)}`}
                    onClick={() => onOpen(b)}
                  />
                </Tooltip>
                <Tooltip title="Удалить">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={`Удалить бронь ${formatRange(b)}`}
                    onClick={() => onDelete(b)}
                  />
                </Tooltip>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
