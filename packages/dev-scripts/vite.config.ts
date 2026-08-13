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
        output: ["dist/**"],
      },
      "gen:examples": {
        command: "tsx examples/gen.ts",
        input: [
          { pattern: "examples/*/*/.bnexample.json", base: "workspace" },
          { pattern: "examples/*/*/README.md", base: "workspace" },
          { pattern: "examples/*/*/src/**", base: "workspace" },
          { pattern: "packages/dev-scripts/examples/**", base: "workspace" },
        ],
        output: [
          { pattern: "examples/*/*/package.json", base: "workspace" },
          { pattern: "examples/*/*/tsconfig.json", base: "workspace" },
          { pattern: "examples/*/*/vite.config.ts", base: "workspace" },
          { pattern: "examples/*/*/index.html", base: "workspace" },
          { pattern: "examples/*/*/main.tsx", base: "workspace" },
          { pattern: "examples/*/*/tailwind.css", base: "workspace" },
          { pattern: "playground/src/examples.gen.tsx", base: "workspace" },
        ],
      },
      "gen:docs": {
        command: "tsx examples/genDocs.ts",
        input: [
          { pattern: "examples/*/*/.bnexample.json", base: "workspace" },
          { pattern: "examples/*/*/README.md", base: "workspace" },
          { pattern: "examples/*/*/src/**", base: "workspace" },
          { pattern: "packages/dev-scripts/examples/**", base: "workspace" },
        ],
        output: [
          {
            pattern: "docs/components/example/generated/**",
            base: "workspace",
          },
          { pattern: "docs/content/examples/**", base: "workspace" },
        ],
      },
    },
  },
});
