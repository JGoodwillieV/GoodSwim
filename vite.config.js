import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon-16x16.png', 'favicon-32x32.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png', 'team-logo-white.png', 'team-logo.png'],
      manifest: {
        name: 'GoodSwim',
        short_name: 'GoodSwim',
        description: 'Swim Team Management Platform',
        theme_color: '#0ea5e9',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Increase cache size limit to 3MB (your bundle is 2.22 MB)
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cwribodiexjmnialapgr\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5 // 5 minutes
              }
            }
          }
        ]
      },
      // Inject custom service worker for push notifications
      injectManifest: {
        swSrc: 'public/service-worker.js',
        swDest: 'dist/service-worker.js'
      }
    })
  ],
})
