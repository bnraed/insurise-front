import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Spring AI (:8080) — doit être AVANT /api
      "/api/chat": {
        target: "http://54.87.232.38:8080",
        changeOrigin: true,
        secure: false,
      },
      "/api/sinistre": {
        target: "http://54.87.232.38:8080",
        changeOrigin: true,
        secure: false,
      },
      "/api/ai": {
        target: "http://54.87.232.38:8080",
        changeOrigin: true,
        secure: false,
      },
      // Back principal (:8085) — tout le reste
      "/api": {
        target: "http://54.87.232.38:8085",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});