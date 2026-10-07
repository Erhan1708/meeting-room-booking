import { Outlet } from 'react-router';

import { Header } from './Header';

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Перейти к содержимому
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
