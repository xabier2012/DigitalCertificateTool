import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    commonjsOptions: {
      include: [/packages\/shared/, /packages\/core/, /node_modules/],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
    },
  },
  optimizeDeps: {
    include: ['@cert-manager/shared', '@cert-manager/core'],
  },
  server: {
    port: 5173,
  },
});
