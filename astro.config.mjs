// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

// The resume link lives in the portfolio content.
const { resume } = parse(readFileSync("./src/content/index.yaml", "utf8"));

// Use Astro's default static output.
export default defineConfig({
  // Absolute page URLs for the canonical link and social preview tags.
  site: "https://edyan.me",
  // The previous site hosted the resume as a PDF; old links redirect to it.
  redirects: { "/edyan_resume.pdf": resume },
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
