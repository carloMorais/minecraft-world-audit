import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Everything runs in the browser: the extractor in src/ is shared with the CLI; node:zlib is
// replaced by an fflate shim and node:buffer by the "buffer" npm package.
export default defineConfig({
  root: 'web',
  base: './',
  plugins: [react()],
  resolve: {
    alias: { zlib: fileURLToPath(new URL('./web/src/shims/zlib.js', import.meta.url)) },
  },
  worker: { format: 'es' },
  server: { port: 5173, fs: { allow: ['..'] } },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});
