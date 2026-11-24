import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      // Check docs and example routes without generating interactive demos.
      test: {
        command: "node validate-links.mjs",
        cache: {
          input: [
            { auto: true },
            "content/{docs,pages}/**/*.{md,mdx}",
            "content/examples/*.{md,mdx}",
            { pattern: "examples/*/*/.bnexample.json", base: "workspace" },
            { pattern: "examples/*/*/README.md", base: "workspace" },
            {
              pattern: "packages/dev-scripts/examples/{examplePage,util}.ts",
              base: "workspace",
            },
          ],
        },
      },
    },
  },
});
