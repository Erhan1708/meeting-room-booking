import { StrictMode } from 'react';
import type { ReactNode } from 'react';

import { AntProvider, StoreProvider, Toaster } from 'shared';

import { AppRoutes } from '@/routes';

import { ErrorBoundary } from './ErrorBoundary';

type Props = {
  /** Инструменты разработки (панель mock-сервера) — передаёт main.tsx, приложение о них не знает. */
  devtools?: ReactNode;
};

export function RootLayout({ devtools }: Props) {
  return (
    <StrictMode>
      <ErrorBoundary>
        <StoreProvider>
          <AntProvider>
            <AppRoutes />
            <Toaster />
            {devtools}
          </AntProvider>
        </StoreProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
