import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api-ppa": {
        target: "https://absen.ppa-bib.net",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-ppa/, ""),
      },
    },
  },
});
