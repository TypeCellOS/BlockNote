import { defineConfig } from "vite-plus";
import { buildCacheInputs } from "../../scripts/build-cache-inputs.js";

export default defineConfig({
  run: {
    tasks: {
      build: {
        command:
          "tsc --project tsconfig.json --composite false --incremental false --rootDir . && vp build",
        cache: {
          input: [...buildCacheInputs("packages/xl-embed-server"), "src/**"],
          output: ["dist/**", "types/**", "!dist/*.tsbuildinfo"],
        },
      },
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  build: {
    lib: {
      formats: ["es"],
      entry: "src/index.ts",
      name: "blocknote-xl-embed-server",
      fileName: "blocknote-xl-embed-server",
    },
  },
});
