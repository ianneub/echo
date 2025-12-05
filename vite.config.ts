import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "src/client",
  publicDir: "../../public",
  define: {
    "import.meta.env.VITE_ECHO_DOMAIN": JSON.stringify(
      process.env.ECHO_DOMAIN || "echo.example.com"
    ),
  },
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/client"),
      "@shared": path.resolve(__dirname, "./src/shared"),
    },
  },
  server: {
    allowedHosts: true,
    proxy: {
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
});
