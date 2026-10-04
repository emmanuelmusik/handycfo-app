import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Capacitor serves the built app from a local file:// or
// capacitor:// origin on device, so relative asset paths matter —
// base: './' keeps built <script>/<link> tags relative instead of
// absolute, which breaks inside the native wrapper.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
  },
});
