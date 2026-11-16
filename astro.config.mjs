// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Use Astro's default static output.
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
