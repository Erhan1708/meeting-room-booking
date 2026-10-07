import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { env } from 'shared/config/env';

/**
 * Единственное место, которое знает, куда ходит приложение.
 * Mock это или реальный API — решает только `VITE_API_MOCKS` в main.tsx:
 * MSW перехватывает те же самые fetch-запросы на уровне сети.
 */
export const baseQuery = fetchBaseQuery({
  baseUrl: env.apiUrl,
  timeout: 15_000,
});
