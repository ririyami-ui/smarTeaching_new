import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Smart Teaching',
        short_name: 'SmartTeach',
        description: 'Smart Teaching Manager Application',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/Logo Smart Teaching Baru_.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Buat RPP',
            short_name: 'RPP',
            description: 'Generate RPP dengan AI',
            url: '/handout-generator',
            icons: [{ src: '/Logo Smart Teaching Baru_.png', sizes: '512x512' }]
          },
          {
            name: 'Jadwal Mengajar',
            short_name: 'Jadwal',
            description: 'Lihat jadwal mengajar hari ini',
            url: '/schedule',
            icons: [{ src: '/Logo Smart Teaching Baru_.png', sizes: '512x512' }]
          },
          {
            name: 'Generate ATP',
            short_name: 'ATP',
            description: 'Susun ATP Kurikulum Nasional',
            url: '/program-mengajar',
            icons: [{ src: '/Logo Smart Teaching Baru_.png', sizes: '512x512' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
    }),
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
});