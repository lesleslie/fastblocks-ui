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
      include: ['fastblocks_ui/static/js/**/*.js'],
      exclude: [
        'fastblocks_ui/static/js/**/vendor/*.js',
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
    // `ui: true` is deliberately NOT set here. It makes even `vitest run`
    // announce "UI started at http://localhost:PORT/__vitest__/", but a `run`
    // exits as soon as the tests finish, so that URL is dead on arrival and
    // serves a 404 -- which reads as "the tests never ran". Use the `test:ui`
    // script (`vitest --ui`), which starts a server that stays up.
  },
  resolve: {
    alias: {
      '@fastblocks-ui/js': resolve(__dirname, './fastblocks_ui/static/js'),
      '@fastblocks-ui/css': resolve(__dirname, './fastblocks_ui/static/css'),
    },
  },
});
