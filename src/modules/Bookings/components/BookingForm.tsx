import { useMemo, useState } from 'react';

import { Alert, Button, DatePicker, Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { ConfirmDialog, toast, toastApiError, useGlobalModal } from 'shared';

import {
  toBookingApiError,
  useCreateBookingMutation,
  useDeleteBookingMutation,
  useGetBookingsQuery,
  useUpdateBookingMutation,
} from '../api';
import type { BookingApiError } from '../api';
import {
  TITLE_MAX_LENGTH,
  bookingLabel,
  findConflict,
  getEndOptions,
  getOfficeNow,
  getStartOptions,
  toMinutes,
  useOfficeNow,
  validateBookingFields,
} from '../lib';
import type { BookingField, TimeOption } from '../lib';
import type { Booking, BookingInput, IsoDate, TimeHHmm } from '../model';

type FormValues = {
  date: Dayjs;
  start?: TimeHHmm;
  end?: TimeHHmm;
  title?: string;
};

type Props = {
  /** Редактируемая бронь; без неё форма создаёт новую. */
  booking?: Booking;
  /** Предзаполнение для новой брони (клик по свободному слоту). */
  initialDate?: IsoDate;
  initialStart?: TimeHHmm;
};

const DATE_FORMAT = 'YYYY-MM-DD';
const PREFERRED_DURATION = 60;

const toSelectOptions = (options: TimeOption[]) =>
  options.map((o) => ({
    value: o.value,
    disabled: o.disabled,
    label: o.reason ? `${o.value} · ${o.reason}` : o.value,
  }));

/** Окончание по умолчанию: час от начала, если свободно, иначе ближайшее доступное. */
function pickEnd(options: TimeOption[], start: TimeHHmm): TimeHHmm | undefined {
  const enabled = options.filter((o) => !o.disabled);
  const preferred = toMinutes(start) + PREFERRED_DURATION;
  return (
    enabled.find((o) => toMinutes(o.value) === preferred)?.value ??
    enabled[enabled.length - 1]?.value
  );
}

const toInput = (values: FormValues): BookingInput => {
  const title = values.title?.trim();
  return {
    date: values.date.format(DATE_FORMAT),
    start: values.start ?? '',
    end: values.end ?? '',
    ...(title ? { title } : {}),
  };
};

export function BookingForm({ booking, initialDate, initialStart }: Props) {
  const { closeModal } = useGlobalModal();
  const [form] = Form.useForm<FormValues>();
  const now = useOfficeNow();

  const [createBooking, createState] = useCreateBookingMutation();
  const [updateBooking, updateState] = useUpdateBookingMutation();
  const [deleteBooking, deleteState] = useDeleteBookingMutation();
  const [submitError, setSubmitError] = useState<BookingApiError | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEdit = Boolean(booking);
  const isSaving = createState.isLoading || updateState.isLoading;
  /** Бронь удалили или она уже началась — сохранять нечего, только закрыть. */
  const isGone = submitError?.kind === 'notFound' || submitError?.code === 'BOOKING_LOCKED';

  const watchedDate = Form.useWatch('date', form);
  const watchedStart = Form.useWatch('start', form);
  const date = (watchedDate ?? dayjs(booking?.date ?? initialDate ?? now.date)).format(DATE_FORMAT);

  // Брони выбранного в форме дня (он может отличаться от дня на странице).
  const { data: bookings = [], isFetching: isFetchingDay } = useGetBookingsQuery(date);

  const slotContext = useMemo(
    () => ({ date, bookings, now, excludeId: booking?.id }),
    [date, bookings, now, booking?.id],
  );
  const startOptions = useMemo(() => getStartOptions(slotContext), [slotContext]);
  const endOptions = useMemo(
    () => (watchedStart ? getEndOptions(watchedStart, slotContext) : []),
    [watchedStart, slotContext],
  );

  // Начальные значения считаются один раз при открытии формы.
  const [initialValues] = useState<FormValues>(() => {
    if (booking) {
      return {
        date: dayjs(booking.date),
        start: booking.start,
        end: booking.end,
        title: booking.title,
      };
    }
    const ctx = { ...slotContext, date: initialDate ?? now.date };
    const start = initialStart ?? getStartOptions(ctx).find((o) => !o.disabled)?.value;
    return {
      date: dayjs(ctx.date),
      start,
      end: start ? pickEnd(getEndOptions(start, ctx), start) : undefined,
      title: '',
    };
  });

  const onValuesChange = (changed: Partial<FormValues>, all: FormValues) => {
    if (submitError && !isGone) setSubmitError(null);
    // Новое начало: сохраняем окончание, если оно ещё допустимо, иначе подставляем разумное.
    // На смену даты не реагируем: брони нового дня ещё грузятся, проверка будет при отправке.
    if ('start' in changed && all.start) {
      const options = getEndOptions(all.start, slotContext);
      const keep = options.some((o) => o.value === all.end && !o.disabled);
      if (!keep) form.setFieldValue('end', pickEnd(options, all.start));
    }
  };

  const showFieldErrors = (errors: Partial<Record<BookingField | string, string>>) => {
    form.setFields(
      Object.entries(errors).map(([name, message]) => ({
        name: name as keyof FormValues,
        errors: message ? [message] : [],
      })),
    );
  };

  const onFinish = async (values: FormValues) => {
    setSubmitError(null);
    const input = toInput(values);

    // Клиентская проверка — для удобства. Источник правды всё равно сервер.
    const fieldErrors = validateBookingFields(input, getOfficeNow());
    if (Object.keys(fieldErrors).length > 0) return showFieldErrors(fieldErrors);

    const conflict = findConflict(input, bookings, booking?.id);
    if (conflict)
      return showFieldErrors({ start: `Пересекается с бронью ${bookingLabel(conflict)}` });

    try {
      if (booking) {
        await updateBooking({ id: booking.id, patch: input, previousDate: booking.date }).unwrap();
        toast.success('Бронь обновлена');
      } else {
        await createBooking(input).unwrap();
        toast.success('Комната забронирована');
      }
      closeModal();
    } catch (err) {
      // Форма остаётся открытой со всеми введёнными данными; список уже перезапрошен
      // (мутации инвалидируют кэш и при ошибке).
      const apiError = toBookingApiError(err);
      setSubmitError(apiError);
      if (apiError.fieldErrors) showFieldErrors(apiError.fieldErrors);
      if (apiError.conflicting) {
        showFieldErrors({ start: `Занято: ${bookingLabel(apiError.conflicting)}` });
      }
    }
  };

  const onConfirmDelete = async () => {
    if (!booking) return;
    try {
      await deleteBooking({ id: booking.id, date: booking.date }).unwrap();
      toast.success('Бронь удалена');
      setConfirmDelete(false);
      closeModal();
    } catch (err) {
      setConfirmDelete(false);
      toastApiError(err);
    }
  };

  return (
    <>
      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={initialValues}
        onValuesChange={onValuesChange}
        onFinish={onFinish}
        disabled={isSaving}
        className="w-full"
      >
        {submitError && (
          <Alert
            className="!mb-4"
            type={submitError.kind === 'conflict' ? 'warning' : 'error'}
            showIcon
            title={
              submitError.kind === 'conflict'
                ? 'Это время только что заняли'
                : 'Не удалось сохранить'
            }
            description={
              isGone
                ? submitError.message
                : `${submitError.message} Введённые данные сохранены — поправьте время и отправьте снова.`
            }
          />
        )}

        <Form.Item<FormValues>
          label="Дата"
          name="date"
          rules={[{ required: true, message: 'Выберите дату' }]}
        >
          <DatePicker
            className="w-full"
            format="DD.MM.YYYY"
            allowClear={false}
            disabledDate={(d) => d.format(DATE_FORMAT) < now.date}
          />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item<FormValues>
            label="Начало"
            name="start"
            rules={[{ required: true, message: 'Выберите время начала' }]}
          >
            <Select
              options={toSelectOptions(startOptions)}
              placeholder="--:--"
              loading={isFetchingDay}
              notFoundContent="Нет свободного времени"
            />
          </Form.Item>

          <Form.Item<FormValues>
            label="Окончание"
            name="end"
            rules={[{ required: true, message: 'Выберите время окончания' }]}
          >
            <Select
              options={toSelectOptions(endOptions)}
              placeholder="--:--"
              disabled={!watchedStart || isSaving}
              notFoundContent="Сначала выберите начало"
            />
          </Form.Item>
        </div>

        <Form.Item<FormValues> label="Название" name="title" extra="Необязательно">
          <Input maxLength={TITLE_MAX_LENGTH} showCount placeholder="Например, планёрка" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button size="large" onClick={closeModal}>
            {isGone ? 'Закрыть' : 'Отмена'}
          </Button>
          <Button
            size="large"
            type="primary"
            htmlType="submit"
            loading={isSaving}
            disabled={isGone}
          >
            {isEdit ? 'Сохранить' : 'Забронировать'}
          </Button>
        </div>

        {isEdit && !isGone && (
          <div className="mt-3 text-center">
            <Button type="text" danger onClick={() => setConfirmDelete(true)}>
              Удалить бронь
            </Button>
          </div>
        )}
      </Form>

      <ConfirmDialog
        open={confirmDelete}
        title="Удалить бронь?"
        description={
          booking
            ? `Бронь ${bookingLabel(booking)} будет удалена без возможности восстановления.`
            : ''
        }
        confirmLabel="Да, удалить"
        loading={deleteState.isLoading}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
