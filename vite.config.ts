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
        include: ['react', 'react-dom', 'recharts', 'cytoscape', 'cytoscape-cose-bilkent', 'd3', 'use-resize-observer'],
        force: true
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Ensure Rollup/Vite converts mixed CJS/UMD modules to ESM during the build
        commonjsOptions: {
          transformMixedEsModules: true,
          requireReturnsDefault: 'auto'
        },
        rollupOptions: {
            output: {
            manualChunks(id: string) {
              if (!id) return undefined;
              if (id.includes('node_modules')) {
                if (id.includes('recharts')) return 'vendor_recharts';
                // Ensure cytoscape and its extensions (cose-bilkent, cola, etc.) are grouped together
                if (id.includes('cytoscape-cose-bilkent') || id.includes('cytoscape')) return 'vendor_cytoscape';
                if (id.includes('ml-matrix')) return 'vendor_ml_matrix';
                if (id.includes('d3')) return 'vendor_d3';
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