import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';

import { mockSettings } from '@/mocks/devtools';
import { handlers } from '@/mocks/handlers';

export const server = setupServer(...handlers);

// antd опирается на эти API браузера, которых нет в jsdom.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
// jsdom не умеет псевдоэлементы и шумит в консоль — antd они в тестах не нужны.
const getComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (el: Element) => getComputedStyle(el);
Element.prototype.scrollTo ??= function (this: Element, options?: ScrollToOptions | number) {
  if (typeof options === 'object') this.scrollLeft = options.left ?? this.scrollLeft;
};
Element.prototype.scrollBy ??= function (this: Element, options?: ScrollToOptions | number) {
  if (typeof options === 'object') this.scrollLeft += options.left ?? 0;
};
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  localStorage.clear();
  mockSettings.set({ latency: 0, conflictNext: false, failNext: false });
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
