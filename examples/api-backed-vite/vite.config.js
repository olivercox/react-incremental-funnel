import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-incremental-funnel': fileURLToPath(
        new URL('../../src/index.ts', import.meta.url)
      )
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787'
    }
  }
});
