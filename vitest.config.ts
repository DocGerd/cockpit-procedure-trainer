import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/src/**/*.test.{ts,tsx}',
      'apps/*/src/**/*.test.{ts,tsx}',
      'tools/**/*.test.ts',
    ],
    setupFiles: ['./vitest.setup.ts'],
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**', 'apps/web/src/**'],
      exclude: ['**/*.test.{ts,tsx}', '**/e2e/**', '**/*.d.ts', '**/dist/**'],
      reporter: ['text-summary'],
      thresholds: { statements: 95 },
    },
  },
});
