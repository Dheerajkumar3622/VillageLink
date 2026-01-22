
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'https://villagelink-jh20.onrender.com',
        ws: true,
        changeOrigin: true
      },
      '/api': {
        target: 'https://villagelink-jh20.onrender.com',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      // Multi-Page App Configuration
      input: {
        main: resolve(__dirname, 'index.html'),
        user: resolve(__dirname, 'user.html'),
        provider: resolve(__dirname, 'provider.html'),
      },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['lucide-react'],
          'vendor-socket': ['socket.io-client'],
          'feature-ai': ['@tensorflow/tfjs', '@tensorflow-models/mobilenet'],
          'feature-blockchain': ['ethers'],
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          if (facadeModuleId && facadeModuleId.includes('components/')) {
            const match = facadeModuleId.match(/components\/(\w+)/);
            if (match) {
              return `views/${match[1]}-[hash].js`;
            }
          }
          return 'assets/[name]-[hash].js';
        },
        assetFileNames: 'assets/[name]-[hash].[ext]',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    },
    minify: 'esbuild',
    cssCodeSplit: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'long'],
    exclude: ['@tensorflow/tfjs', '@tensorflow-models/mobilenet', 'ethers']
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    minifyIdentifiers: true,
    minifySyntax: true,
  }
});
