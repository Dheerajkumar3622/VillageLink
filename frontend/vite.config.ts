
// Vite restart trigger 3
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'path';

// Set VITE_DEV_HTTPS=0 to serve plain http:// on LAN (no self-signed cert warnings; use with npm run dev:host).
const useDevHttps = process.env.VITE_DEV_HTTPS !== '0';

export default defineConfig({
  plugins: [
    react(), 
    ...(useDevHttps ? [basicSsl()] : []),
    {
      name: 'html-rewrite-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url ? req.url.split('?')[0] : '';
          if (url === '/provider') {
            req.url = '/provider.html';
          } else if (url === '/admin') {
            req.url = '/admin.html';
          } else if (url === '/user') {
            req.url = '/user.html';
          }
          next();
        });
      }
    }
  ],
  envDir: resolve(__dirname, '../'),
  server: {
    host: true, // Allow external access via IP
    port: 3000,
    watch: {
      ignored: [
        '**/android/**',
        '**/ios/**',
        '**/dist/**',
        '**/.gradle/**',
        '**/node_modules/**',
      ],
    },
    proxy: {
      '/socket.io': {
        target: 'https://backendlink-0xjs.onrender.com', // Live backend for seamless local wifi testing
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'https://backendlink-0xjs.onrender.com', // Live backend for seamless local wifi testing
        changeOrigin: true,
        secure: false,
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
        admin: resolve(__dirname, 'admin.html'),
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
    include: ['react', 'react-dom', 'lucide-react', 'long', 'socket.io-client', 'firebase/app', 'firebase/auth'],
    exclude: ['@tensorflow/tfjs', '@tensorflow-models/mobilenet', 'ethers']
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    minifyIdentifiers: true,
    minifySyntax: true,
  }
});
