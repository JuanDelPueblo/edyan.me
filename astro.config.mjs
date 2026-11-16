// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Use Astro's default static output.
export default defineConfig({
  // Download Silkscreen at build time and serve it from this site.
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Silkscreen",
      cssVariable: "--font-silkscreen",
      fallbacks: ["Verdana", "DejaVu Sans", "sans-serif"],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
