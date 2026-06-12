import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'LyricsLabs',
          short_name: 'LyricsLabs',
          description: 'Learn every word. Sing every song.',
          theme_color: '#4f46e5',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api/setlistfm': {
          target: 'https://api.setlist.fm/rest/1.0',
          changeOrigin: true,
          rewrite: (reqPath) => {
            const [, qs = ''] = reqPath.split('?')
            const params = new URLSearchParams(qs)
            const targetPath = params.get('path') || '/'
            params.delete('path')
            const q = params.toString()
            return q ? `${targetPath}?${q}` : targetPath
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('x-api-key', env.VITE_SETLISTFM_API_KEY || '')
              proxyReq.setHeader('Accept', 'application/json')
            })
          },
        },
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
  }
})
