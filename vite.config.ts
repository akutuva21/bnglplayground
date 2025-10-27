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
      optimizeDeps: {
        include: ['react', 'react-dom', 'recharts', 'cytoscape', 'cytoscape-cose-bilkent', 'd3']
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id: string) {
              if (!id) return undefined;
              if (id.includes('node_modules')) {
                if (id.includes('recharts')) return 'vendor_recharts';
                if (id.includes('cytoscape')) return 'vendor_cytoscape';
                if (id.includes('ml-matrix')) return 'vendor_ml_matrix';
                if (id.includes('monaco-editor') || id.includes('monaco')) return 'vendor_monaco';
                return 'vendor_misc';
              }
              return undefined;
            },
          },
        },
      },
      test: {
        environment: 'node',
        include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts']
      }
    };
});