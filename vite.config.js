import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["b31sb3lrs6tg1.png"],
      manifest: {
        name: "Atmos Tracker",
        short_name: "Atmos Tracker",
        description: "Unofficial Atmos Rewards points & status tracker",
        start_url: "/",
        display: "standalone",
        background_color: "#0d1b2a",
        theme_color: "#413691",
        // Reusing your existing logo for both sizes — browsers scale it fine, but for a
        // crisper home-screen icon, drop in properly-sized 192x192 and 512x512 PNGs later
        // and point these entries at them instead.
        icons: [
          { src: "/b31sb3lrs6tg1.png", sizes: "192x192", type: "image/png" },
          { src: "/b31sb3lrs6tg1.png", sizes: "512x512", type: "image/png" },
          { src: "/b31sb3lrs6tg1.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
