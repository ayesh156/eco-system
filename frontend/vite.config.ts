import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core libraries (must be first to avoid circular deps)
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          
          // React Router
          if (id.includes('node_modules/react-router') || 
              id.includes('node_modules/@remix-run/router')) {
            return 'vendor-router';
          }
          
          // Radix UI components (largest UI library)
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          
          // Lucide icons (heavy icon set)
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          
          // TanStack Query
          if (id.includes('node_modules/@tanstack/')) {
            return 'vendor-query';
          }
          
          // UI utilities
          if (id.includes('node_modules/clsx') || 
              id.includes('node_modules/class-variance-authority') || 
              id.includes('node_modules/tailwind-merge')) {
            return 'vendor-ui-utils';
          }
          
          // Date/time libraries
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }
          
          // Google Generative AI (AI Assistant dependency - large)
          if (id.includes('node_modules/@google/generative-ai')) {
            return 'vendor-ai';
          }
          
          // PDF/Print libraries
          if (id.includes('node_modules/jspdf') || 
              id.includes('node_modules/html2canvas')) {
            return 'vendor-pdf';
          }
          
          // Command palette UI
          if (id.includes('node_modules/cmdk')) {
            return 'vendor-cmdk';
          }
          
          // Remaining node_modules
          if (id.includes('node_modules/')) {
            return 'vendor-other';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Allow larger vendor chunks to avoid warnings
  },
})
