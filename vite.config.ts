import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), tsconfigPaths()],
  server: {
    allowedHosts: true,
  },
  base: process.env.NODE_ENV === 'production' ? '/vibecut/' : '/',
});
