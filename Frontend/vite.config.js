import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The exposed Arena preview serves only synthetic, local UI state. Do not use
// the Vite development server as the production trading-control interface.
export default defineConfig({
  plugins: [react()],
  server: { allowedHosts: ['.e2b.app'] },
  preview: { allowedHosts: ['.e2b.app'] },
});
