import { useState } from 'react';

import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Skeleton, Spin } from 'antd';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  toast,
  toastApiError,
  useGlobalModal,
  useQueryParams,
} from 'shared';

import { toBookingApiError, useDeleteBookingMutation, useGetBookingsQuery } from '../api';
import {
  bookingLabel,
  formatDateLong,
  getStartOptions,
  isBookingLocked,
  isIsoDate,
  isPastDate,
  useOfficeNow,
} from '../lib';
import type { Booking, IsoDate, TimeHHmm } from '../model';
import { BookingDetails } from './BookingDetails';
import { BookingForm } from './BookingForm';
import { BookingList } from './BookingList';
import { DayTimeline } from './DayTimeline';
import { WeekStrip } from './WeekStrip';

/** Дата хранится в URL (`?date=`): переживает перезагрузку, ссылкой можно поделиться. */
const QUERY_DEFAULTS = { date: '' };

export function BookingsSection() {
  const now = useOfficeNow();
  const [params, setParams] = useQueryParams(QUERY_DEFAULTS);
  const date: IsoDate = isIsoDate(params.date) ? params.date : now.date;

  const {
    data: bookings,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetBookingsQuery(date);
  const [deleteBooking, deleteState] = useDeleteBookingMutation();
  const [toDelete, setToDelete] = useState<Booking | null>(null);
  const { openModal } = useGlobalModal();

  const isPast = isPastDate(date, now);
  const hasFreeTime = getStartOptions({ date, bookings: bookings ?? [], now }).some(
    (o) => !o.disabled,
  );
  const canCreate = !isPast && Boolean(bookings) && hasFreeTime;

  const setDate = (next: IsoDate) => setParams({ date: next === now.date ? '' : next });

  const openCreate = (start?: TimeHHmm) =>
    openModal({
      title: 'Новая бронь',
      width: 480,
      body: <BookingForm initialDate={date} initialStart={start} />,
    });

  const openBooking = (booking: Booking) =>
    openModal(
      isBookingLocked(booking, now)
        ? { title: 'Бронь', width: 480, body: <BookingDetails booking={booking} /> }
        : { title: 'Изменить бронь', width: 480, body: <BookingForm booking={booking} /> },
    );

  const onConfirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteBooking({ id: toDelete.id, date: toDelete.date }).unwrap();
      toast.success('Бронь удалена');
    } catch (err) {
      toastApiError(err);
    } finally {
      setToDelete(null);
    }
  };

  const createButton = (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      disabled={!canCreate}
      onClick={() => openCreate()}
    >
      Забронировать
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      <WeekStrip date={date} today={now.date} onChange={setDate} actions={createButton} />

      <Card
        title={
          <h2 className="m-0 text-base font-semibold capitalize" aria-live="polite">
            {formatDateLong(date)}
          </h2>
        }
        extra={
          isFetching && !isLoading ? (
            <output className="flex items-center gap-2 text-xs text-muted">
              <Spin size="small" /> Обновление…
            </output>
          ) : null
        }
      >
        <div className="space-y-4" aria-busy={isFetching}>
          {isPast && (
            <Alert
              type="info"
              showIcon
              title="Прошедшая дата — брони доступны только для просмотра."
            />
          )}
          {!isPast && bookings && !hasFreeTime && (
            <Alert type="info" showIcon title="На эту дату свободного времени не осталось." />
          )}

          {isError && bookings && (
            <Alert
              type="warning"
              showIcon
              title="Не удалось обновить данные — показана последняя загруженная версия."
              action={
                <Button size="small" onClick={() => refetch()}>
                  Повторить
                </Button>
              }
            />
          )}

          {isLoading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : isError && !bookings ? (
            <ErrorState
              message={toBookingApiError(error).message}
              onRetry={() => refetch()}
              retrying={isFetching}
            />
          ) : bookings ? (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
              <div className="hidden md:block">
                <DayTimeline
                  date={date}
                  bookings={bookings}
                  now={now}
                  onCreate={openCreate}
                  onOpen={openBooking}
                />
              </div>

              <section aria-labelledby="bookings-list-title">
                <h3 id="bookings-list-title" className="mb-1 text-sm font-semibold text-muted">
                  Брони ({bookings.length})
                </h3>
                {bookings.length === 0 ? (
                  <EmptyState
                    title="Броней нет"
                    description={
                      isPast
                        ? 'В этот день переговорная была свободна.'
                        : 'Переговорная свободна весь день.'
                    }
                    action={canCreate ? createButton : undefined}
                  />
                ) : (
                  <BookingList
                    bookings={bookings}
                    now={now}
                    onOpen={openBooking}
                    onDelete={setToDelete}
                  />
                )}
              </section>
            </div>
          ) : null}
        </div>
      </Card>

      <ConfirmDialog
        open={toDelete !== null}
        title="Удалить бронь?"
        description={
          toDelete
            ? `Бронь ${bookingLabel(toDelete)} будет удалена без возможности восстановления.`
            : ''
        }
        confirmLabel="Да, удалить"
        loading={deleteState.isLoading}
        onConfirm={onConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
