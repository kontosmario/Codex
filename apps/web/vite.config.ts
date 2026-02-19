import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const base =
    env.VITE_BASE_PATH ||
    (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : '/');

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['cat-icon.svg'],
        manifest: {
          name: 'Family Budget Cats',
          short_name: 'BudgetCats',
          description: 'Household finance tracker for 2 users.',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          theme_color: '#f2f6ff',
          background_color: '#edf2ff',
          icons: [
            {
              src: 'cat-icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'cat-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: ({ url, request }) =>
                request.method === 'GET' && /\/summary$/.test(url.pathname),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'summary-cache',
                expiration: {
                  maxEntries: 48,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            },
            {
              urlPattern: ({ url, request }) =>
                request.method === 'GET' && /\/transactions$/.test(url.pathname),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'transactions-cache',
                expiration: {
                  maxEntries: 48,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            }
          ]
        }
      })
    ],
    server: {
      host: true,
      port: 5173
    }
  };
});
