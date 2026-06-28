import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest (not the default generateSW) is required here: it's
      // the only strategy that lets us ship our own service worker source
      // with a custom `push` event listener. generateSW only knows how to
      // produce a caching worker — it has no hook for push notifications.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['icons.svg'],
      manifest: {
        name: 'SplashPass Operator',
        short_name: 'SP Operator',
        theme_color: '#0A1628',
        background_color: '#0A1628',
        display: 'standalone',
        icons: [
          {
            src: 'icons.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://splashmain.vercel.app',
        changeOrigin: true,
        secure: true,
        headers: {
          'x-splashpass-site': 'operator',
        },
      },
    },
  },
})
