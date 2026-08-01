import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo512-transparent.png"],
      manifest: {
        name: "Atmos Tracker",
        short_name: "Atmos Tracker",
        description: "Unofficial Atmos Rewards points & status tracker",
        start_url: "/",
        display: "standalone",
        background_color: "#0d1b2a",
        theme_color: "#413691",
        icons: [
          { src: "/logo512-transparent.png", sizes: "192x192", type: "image/png" },
          { src: "/logo512-transparent.png", sizes: "512x512", type: "image/png" },
          { src: "/logo512-transparent.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
