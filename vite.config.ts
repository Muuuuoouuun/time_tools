import { defineConfig } from 'vite';

// Relative base: assets load relative to index.html, so one build works at the root
// (e.g. Vercel: your-app.vercel.app/) AND at a subpath (classin.cloud/timetools/).
// This app has no client-side routing, so relative paths are safe everywhere.
// (For a subpath, serve with a trailing slash — see DEPLOY.md.)
export default defineConfig({
  base: './',
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
