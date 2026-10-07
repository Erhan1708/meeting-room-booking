import { createRoot } from 'react-dom/client';

import { RootLayout } from './app';
import { env } from './shared/config';

import './shared/config/global.css';

/**
 * Точка сборки приложения — единственное место, которое знает про mock-сервер.
 * С VITE_API_MOCKS=false MSW даже не попадает в бандл как исполняемый код,
 * и запросы уходят на реальный API (VITE_API_URL).
 */
async function bootstrap() {
  let devtools = null;

  if (env.apiMocks) {
    const { startMocks, MockDevPanel } = await import('./mocks');
    await startMocks();
    devtools = <MockDevPanel />;
  }

  createRoot(document.getElementById('root')!).render(<RootLayout devtools={devtools} />);
}

void bootstrap();
