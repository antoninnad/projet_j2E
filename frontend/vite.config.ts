import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === "serve" ? "/" : "./",
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    origin: "http://localhost:5173",
    cors: { origin: /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/ },
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    outDir: "../target/classes/static/ui",
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: "src/main.tsx",
      output: { entryFileNames: "app.js", assetFileNames: "app.[ext]" },
    },
  },
}))

