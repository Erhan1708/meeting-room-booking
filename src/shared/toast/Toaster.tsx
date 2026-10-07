import { Toaster as HotToaster } from 'react-hot-toast';

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: { borderRadius: 8, fontSize: 14, padding: '10px 14px', maxWidth: 420 },
        error: { duration: 6000 },
      }}
    />
  );
}
