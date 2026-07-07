import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Champions Companion",
        short_name: "Champions",
        description:
          "Pokémon Champions team-building & battle companion (stat calc, damage calc, team builder).",
        theme_color: "#0A0E1A",
        background_color: "#0A0E1A",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cache the exported data JSON so the app works fully offline.
        globPatterns: ["**/*.{js,css,html,svg,png,json}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/data/"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "champions-data" },
          },
          {
            // Pokémon sprites (championsbattledata + PokéAPI/GitHub artwork).
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "champions-sprites",
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // Workspace packages ship TypeScript source; let Vite transpile them rather
  // than pre-bundling, so the shared calc-core math runs verbatim in-browser.
  optimizeDeps: {
    exclude: [
      "@champions/calc-core",
      "@champions/team-builder",
      "@champions/ruleset-config",
    ],
  },
});
