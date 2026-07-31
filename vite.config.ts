import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "og/*.png"],
      manifest: {
        name: "Kosher Croatia 2026",
        short_name: "Kosher HR",
        description:
          "Search the 2026 kosher products list of Croatia. Works offline.",
        theme_color: "#1668c9",
        background_color: "#0b1b2e",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // The whole product database is precached: the app has to work in a
        // supermarket with no signal, which is its main use case.
        globPatterns: ["**/*.{js,css,html,svg,woff2}", "icon-*.png", "apple-touch-icon.png"],
        // Share cards are for crawlers, not for the person in the shop -- 110
        // OG images would bloat the offline bundle to 22MB for no user benefit.
        globIgnores: ["og/**", "img/**", "**/sitemap.xml"],
        navigateFallbackDenylist: [/^\/og\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/img\/.*\.webp$/,
            handler: "CacheFirst",
            options: {
              cacheName: "brand-images",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }),
  ],
  build: { target: "es2020" },
});
