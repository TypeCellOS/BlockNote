import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: "tsc",
        input: [
          { auto: true },
          { pattern: "!**/*.tsbuildinfo", base: "workspace" },
        ],
        // Without declared outputs the cache can't restore `dist/` on a
        // cache hit, leaving consumers type-checking against missing or
        // stale declarations.
        output: ["dist/**", "!dist/**/*.tsbuildinfo"],
      },
    },
  },
});
