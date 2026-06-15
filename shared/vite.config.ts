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
      },
    },
  },
});
