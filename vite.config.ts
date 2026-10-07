/// <reference types="vitest/config" />
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      app: resolve(__dirname, './src/app'),
      mocks: resolve(__dirname, './src/mocks'),
      modules: resolve(__dirname, './src/modules'),
      routes: resolve(__dirname, './src/routes'),
      shared: resolve(__dirname, './src/shared'),
      widgets: resolve(__dirname, './src/widgets'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    // fetch в Node не принимает относительные URL — заодно проверяем, что базовый URL настраивается.
    env: { VITE_API_URL: 'http://localhost' },
  },
});
