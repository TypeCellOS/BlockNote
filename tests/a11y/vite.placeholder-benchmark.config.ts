import { defineConfig } from "vite-plus";
import config from "./vite.config.js";

export default defineConfig({
  ...config,
  test: {
    ...config.test,
    name: "placeholder-benchmark",
    include: [
      "../packages/core/src/extensions/Placeholder/Placeholder.benchmark.ts",
    ],
    reporters: ["verbose"],
  },
});
