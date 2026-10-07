/** Переменные окружения в одном месте, с типами и значениями по умолчанию. */
export const env = {
  /** По умолчанию mock включён: без бэкенда приложение должно работать «из коробки». */
  apiMocks: import.meta.env.VITE_API_MOCKS !== 'false',
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? '',
};
