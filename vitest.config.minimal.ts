/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node', // Use node environment for service tests
    setupFiles: ['./vitest.setup.minimal.ts'],
    testTimeout: 5000,
    include: [
      'src/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'app/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
  },
});