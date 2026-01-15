
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
    // Enable source maps for debugging (disable in production if needed)
    sourcemap: false,
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Chunk size warning threshold
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Aggressive code splitting for optimal loading
        manualChunks: {
          // Core React - loads first
          'vendor-react': ['react', 'react-dom'],
          // UI components - loads with first view
          'vendor-ui': ['lucide-react'],
          // Socket.IO - loads after first paint
          'vendor-socket': ['socket.io-client'],
          // Heavy dependencies - load on-demand only
          'feature-ai': ['@tensorflow/tfjs', '@tensorflow-models/mobilenet'],
          'feature-blockchain': ['ethers'],
        },
        // Better chunk naming for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          // Name view chunks by their component
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
    // Minification settings
    minify: 'esbuild',
    // CSS code splitting
    cssCodeSplit: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'long'],
    // Exclude heavy deps from pre-bundling (loaded on-demand)
    exclude: ['@tensorflow/tfjs', '@tensorflow-models/mobilenet', 'ethers']
  },
  // Enable esbuild optimizations
  esbuild: {
    // Remove console.log in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Minify identifiers
    minifyIdentifiers: true,
    minifySyntax: true,
  }
});
