import { baseApi } from 'shared/store';

import type { Booking, BookingInput, IsoDate } from '../model';

const TAG = 'Booking' as const;

/**
 * Эндпоинты по контракту из ТЗ. UI использует только хуки ниже и ничего не знает
 * про URL, HTTP-методы и то, mock это или реальный бэкенд.
 *
 * Мутации инвалидируют список и при ошибке: после 409 (слот заняли), 404 (бронь
 * удалили) или 422 (бронь уже началась) пользователь сразу видит актуальные данные.
 */
export const bookingsApi = baseApi.enhanceEndpoints({ addTagTypes: [TAG] }).injectEndpoints({
  endpoints: (build) => ({
    getBookings: build.query<Booking[], IsoDate>({
      query: (date) => ({ url: '/api/bookings', params: { date } }),
      providesTags: (_result, _error, date) => [{ type: TAG, id: date }],
    }),

    createBooking: build.mutation<Booking, BookingInput>({
      query: (body) => ({ url: '/api/bookings', method: 'POST', body }),
      invalidatesTags: (_result, _error, body) => [{ type: TAG, id: body.date }],
    }),

    /** `previousDate` нужен, чтобы при переносе на другой день обновился и старый день. */
    updateBooking: build.mutation<
      Booking,
      { id: string; patch: BookingInput; previousDate: IsoDate }
    >({
      query: ({ id, patch }) => ({ url: `/api/bookings/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (_result, _error, { patch, previousDate }) => [
        { type: TAG, id: patch.date },
        { type: TAG, id: previousDate },
      ],
    }),

    deleteBooking: build.mutation<void, Pick<Booking, 'id' | 'date'>>({
      query: ({ id }) => ({ url: `/api/bookings/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { date }) => [{ type: TAG, id: date }],
    }),
  }),
});

export const {
  useGetBookingsQuery,
  useCreateBookingMutation,
  useUpdateBookingMutation,
  useDeleteBookingMutation,
} = bookingsApi;
