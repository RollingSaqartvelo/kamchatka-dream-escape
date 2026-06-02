// Сборка под собственный сервер (Node, Nitro node-server) — для self-host на VPS.
// Обычный vite.config.ts остаётся для деплоя через Lovable/Cloudflare.
// Сборка: `vite build --config vite.config.node.ts` → dist/server/index.mjs.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Принудительно включаем Nitro с node-server (вне Lovable плагин иначе пропускается).
  nitro: { preset: "node-server" },
});
