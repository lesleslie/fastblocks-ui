import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/js/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/fastbulma/static/js/**/*.js'],
      exclude: [
        'src/fastbulma/static/js/**/vendor/*.js',
        'tests/**',
        '**/*.test.js',
        '**/*.spec.js',
      ],
      // Target: >80% code coverage
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      // All statements except those marked with /* istanbul ignore next */
      ignoreEmptyLines: true,
    },
    include: ['tests/js/**/*.{test,spec}.{js,mjs,cjs}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    // Enable UI for better debugging
    ui: true,
  },
  resolve: {
    alias: {
      '@fastbulma/js': resolve(__dirname, './src/fastbulma/static/js'),
      '@fastbulma/css': resolve(__dirname, './src/fastbulma/static/css'),
    },
  },
});
