import { defineConfig } from 'vite';

// Deployed at classin.cloud/timetools — assets must resolve under that subpath.
// If the subpath ever changes, this single line (+ rebuild) is all that changes.
export default defineConfig({
  base: '/timetools/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
