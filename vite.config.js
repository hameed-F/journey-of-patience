import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
});
