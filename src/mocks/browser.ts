import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/** Запускает mock-сервер в Service Worker. Остальные запросы (статика, шрифты) идут в сеть. */
export async function startMocks(): Promise<void> {
  await setupWorker(...handlers).start({
    onUnhandledRequest: 'bypass',
    quiet: !import.meta.env.DEV,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}
