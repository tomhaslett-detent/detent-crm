import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";

// The IIS build does not inject the Base44 editor bridge or send errors
// to its Cloudflare-only reporting service.
function omitPlatformHooks() {
  const replacements = new Map([
    ["base44:document", "export const Base44Scripts = () => null;"],
    ["cloudflare:workers", "export const env = {}; export const waitUntil = () => {};"],
  ]);
  return {
    name: "detent-iis-platform-hooks",
    enforce: "pre",
    resolveId(id) {
      if (replacements.has(id)) return "\0" + id;
    },
    load(id) {
      if (id.startsWith("\0")) return replacements.get(id.slice(1));
    },
  };
}

export default defineConfig({
  build: { outDir: "dist-iis" },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [omitPlatformHooks(), tanstackStart({ srcDirectory: "src" }), react()],
});
