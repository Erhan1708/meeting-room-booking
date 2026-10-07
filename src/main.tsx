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
  const root = createRoot(document.getElementById('root')!);
  let devtools = null;

  if (env.apiMocks) {
    try {
      const { startMocks, MockDevPanel } = await import('./mocks');
      await startMocks();
      devtools = <MockDevPanel />;
    } catch (error) {
      // Service Worker доступен только в защищённом контексте (localhost или HTTPS).
      console.error('[mocks] не удалось запустить mock API', error);
      root.render(<MocksUnavailable />);
      return;
    }
  }

  root.render(<RootLayout devtools={devtools} />);
}

function MocksUnavailable() {
  const localUrl = `http://localhost${location.port ? `:${location.port}` : ''}${location.pathname}`;

  return (
    <div role="alert" className="mx-auto max-w-xl space-y-3 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Не удалось запустить mock API</h1>
      <p className="text-muted">
        Демо работает без бэкенда: запросы перехватывает Service Worker, а браузер разрешает его
        только на <b>localhost</b> или по <b>HTTPS</b>.
      </p>
      {!window.isSecureContext && (
        <p>
          Откройте приложение по адресу{' '}
          <a className="text-primary underline" href={localUrl}>
            {localUrl}
          </a>
          .
        </p>
      )}
    </div>
  );
}

void bootstrap();
