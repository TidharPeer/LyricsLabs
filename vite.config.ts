import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: true,
        advancedChunks: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|react-router-dom)/ },
            { name: 'vendor-ui',    test: /node_modules[\\/](@radix-ui|lucide-react|class-variance-authority|clsx|tailwind-merge)/ },
            { name: 'vendor-supabase', test: /node_modules[\\/]@supabase/ },
          ],
        },
      },
    },
  },
})
