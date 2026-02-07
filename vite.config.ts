import { defineConfig, type Plugin } from "vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// Prevent Vite from treating Tiled .tsx (tileset XML) files as TypeScript JSX
const tiledTilesetPlugin = (): Plugin => ({
  name: "tiled-tileset-plugin",
  resolveId: {
    order: "pre",
    handler(sourceId) {
      if (!sourceId.endsWith(".tsx")) return;
      return { id: "tileset:" + sourceId, external: "relative" };
    },
  },
});

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [tiledTilesetPlugin()],
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    assetsInlineLimit: 0, // Excalibur cannot handle inlined XML in production
  },
}));
