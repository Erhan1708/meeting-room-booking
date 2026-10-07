import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import toast from 'react-hot-toast';

import { normalizeApiError } from 'shared/store/lib/normalizeError';

export { toast };

export function toastApiError(
  error: FetchBaseQueryError | SerializedError | unknown,
  fallback?: string,
): void {
  const { message } = normalizeApiError(error);
  toast.error(fallback ?? message);
}
