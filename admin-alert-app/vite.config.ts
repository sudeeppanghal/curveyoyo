import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Pyoneer Admin Live Alerts",
        short_name: "Pyoneer Alerts",
        description: "Real-time deposit, order, and support ticket alerts with instant sound notifications.",
        theme_color: "#120324",
        background_color: "#0a0118",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "https://api.iconify.design/lucide:bell-ring.svg?color=%23fbbf24",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "https://api.iconify.design/lucide:bell-ring.svg?color=%23fbbf24",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
