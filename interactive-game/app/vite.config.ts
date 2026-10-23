import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  // Keep optional runtime binaries out of the bundle; serve pinned local files.
  resolve: {
    conditions: [
      "onnxruntime-web-use-extern-wasm",
      "module",
      "browser",
      "development|production",
    ],
  },
  server: { proxy: { "/api": "http://127.0.0.1:8787" } },
  build: { outDir: "dist", sourcemap: false },
});
