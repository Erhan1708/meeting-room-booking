import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export type NormalizedErrorKind =
  | 'network'
  | 'notFound'
  | 'validation'
  | 'conflict'
  | 'server'
  | 'unknown';

export interface NormalizedError {
  kind: NormalizedErrorKind;
  message: string;
  /** Машинный код ошибки от сервера (`CONFLICT`, `BOOKING_LOCKED`, …). */
  code?: string;
  fieldErrors?: Record<string, string>;
  /** Дополнительные данные ошибки как есть — их разбирает модуль, которому они нужны. */
  details?: Record<string, unknown>;
  status?: number;
}

const DEFAULT_MESSAGES: Record<NormalizedErrorKind, string> = {
  network: 'Проблема с сетью. Проверьте подключение и попробуйте снова.',
  notFound: 'Запись не найдена — возможно, её уже удалили.',
  validation: 'Проверьте правильность заполнения полей.',
  conflict: 'Данные успели измениться. Обновили список — проверьте и попробуйте снова.',
  server: 'Ошибка сервера. Попробуйте позже.',
  unknown: 'Произошла непредвиденная ошибка.',
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function kindFromStatus(status: number): NormalizedErrorKind {
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

function stringRecord(v: unknown): Record<string, string> | undefined {
  if (!isRecord(v)) return undefined;
  const entries = Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string');
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * Приводит любую ошибку запроса к `{ kind, message, … }`.
 * Ожидаемый формат тела ошибки: `{ code, message, details?: { fieldErrors?, … } }`.
 */
export function normalizeApiError(
  error: FetchBaseQueryError | SerializedError | unknown,
): NormalizedError {
  if (!isRecord(error)) return { kind: 'unknown', message: DEFAULT_MESSAGES.unknown };

  if (!('status' in error)) {
    const msg = typeof error.message === 'string' ? error.message : DEFAULT_MESSAGES.unknown;
    return { kind: 'unknown', message: msg };
  }

  const status = error.status;
  if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') {
    return { kind: 'network', message: DEFAULT_MESSAGES.network };
  }
  if (typeof status !== 'number') {
    return { kind: 'server', message: DEFAULT_MESSAGES.server };
  }

  const kind = kindFromStatus(status);
  const data = isRecord(error.data) ? error.data : undefined;
  const details = isRecord(data?.details) ? data.details : undefined;

  return {
    kind,
    status,
    message:
      typeof data?.message === 'string' && data.message ? data.message : DEFAULT_MESSAGES[kind],
    code: typeof data?.code === 'string' ? data.code : undefined,
    fieldErrors: stringRecord(details?.fieldErrors),
    details,
  };
}
