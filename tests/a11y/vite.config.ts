// Serves the React fixture against workspace source, without package builds.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: {
      "@blocknote/core": fileURLToPath(
        new URL("../../packages/core/src", import.meta.url),
      ),
      "@blocknote/react": fileURLToPath(
        new URL("../../packages/react/src", import.meta.url),
      ),
      "@blocknote/mantine": fileURLToPath(
        new URL("../../packages/mantine/src", import.meta.url),
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  server: { host: "127.0.0.1", port: 5190, strictPort: true },
});
