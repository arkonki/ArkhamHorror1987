import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Online play in dev: `npm run dev:server` runs the room server on :3001.
    proxy: { '/ws': { target: 'ws://localhost:3001', ws: true } },
  },
});
