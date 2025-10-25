import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      base: '/bnglplayground/',
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        environment: 'node',
        include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts']
      }
    };
});