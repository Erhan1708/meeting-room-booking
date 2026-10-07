/**
 * Настройки поведения mock-сервера, которыми управляет dev-панель.
 * Нужны, чтобы показать состояния, которые в одной вкладке сами не возникнут:
 * загрузку, ошибку сервера и конфликт «слот заняли, пока вы заполняли форму».
 */

export type MockSettings = {
  /** Искусственная задержка ответа, мс. */
  latency: number;
  /** Следующее создание/изменение брони: «другой пользователь» успевает занять слот → 409. */
  conflictNext: boolean;
  /** Следующий запрос завершится 500. */
  failNext: boolean;
};

const DEFAULTS: MockSettings = { latency: 400, conflictNext: false, failNext: false };

let settings: MockSettings = DEFAULTS;
const listeners = new Set<() => void>();

export const mockSettings = {
  get: (): MockSettings => settings,

  set(patch: Partial<MockSettings>): void {
    settings = { ...settings, ...patch };
    listeners.forEach((l) => l());
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Одноразовый флаг: true только для первого вызова после включения. */
  consume(key: 'conflictNext' | 'failNext'): boolean {
    if (!settings[key]) return false;
    mockSettings.set({ [key]: false });
    return true;
  },
};
