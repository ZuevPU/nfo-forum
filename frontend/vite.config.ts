import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '..'), '');

  return {
    plugins: [react()],
    envDir: resolve(__dirname, '..'),
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(
        env.VITE_API_URL ?? 'http://localhost:3001',
      ),
      'import.meta.env.VITE_DEV_VK_ID': JSON.stringify(
        env.VITE_DEV_VK_ID ?? 'dev_user_1',
      ),
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
