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
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', 'cmdk'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-lucide': ['lucide-react'],
          'vendor-utils': ['clsx', 'class-variance-authority', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increased from 500kB to 600kB
  },
})
