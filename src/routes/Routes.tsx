import { BookingsSection } from 'modules';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { GlobalModal } from 'shared';
import { AppShell } from 'widgets';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<BookingsSection />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <GlobalModal />
    </BrowserRouter>
  );
}
